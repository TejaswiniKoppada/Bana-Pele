import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  InfoIcon,
  LocationPinIcon,
  PersonCheckIcon,
} from "../../../assets/icons";
import ConnectionCard from "@/components/common/ConnectionCard/ConnectionCard";
import RecommendLearningPanel from "../../../components/RecommendLearningPanel/RecommendLearningPanel";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  getConnectionInfo,
  getMyConnections,
  initiateConnection,
} from "../../connections/api/connections.api";
import "./ProfilePage.css";

const DEFAULT_CONNECT_MESSAGE = "Hi, I would like to connect with you.";

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Thandi (same id SearchMapView.jsx and connectionsService.js already key
// off of) is positioned as the beginner in this demo — she only ever
// receives learning recommendations, never sends them, regardless of whose
// profile she's viewing. Gated on who's LOGGED IN, not whose profile is
// open, so the other 5 demo accounts keep seeing "Recommend Learning" on
// their own accepted connections (including on Thandi's profile) exactly as
// before. Delete THANDI_USER_ID once demo scoping as a whole is retired.
// ============================================================================
const THANDI_USER_ID = "1490";

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card profile-section">
      <button
        className="profile-section__header"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="profile-section__header-title">
          <InfoIcon className="profile-section__header-icon" />
          {title}
        </span>
        <ChevronRightIcon
          className="profile-section__chevron"
          style={{ transform: `rotate(${open ? -90 : 90}deg)` }}
        />
      </button>
      {open && <div className="profile-section__body">{children}</div>}
    </div>
  );
}

function ProfileField({ label, icon: Icon, children }) {
  if (!children || (Array.isArray(children) && children.length === 0))
    return null;
  return (
    <div className="profile-field">
      {Icon && (
        <span className="profile-field__icon">
          <Icon />
        </span>
      )}
      <div className="profile-field__text">
        <span className="profile-field__label">{label}</span>
        <p className="profile-field__value">
          {Array.isArray(children) ? children.join(", ") : children}
        </p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppState();
  const [profile, setProfile] = useState(location.state?.profile ?? null);
  const [loading, setLoading] = useState(!location.state?.profile);
  const [requestState, setRequestState] = useState(null);
  const [requestError, setRequestError] = useState("");
  const isOwnProfile =
    profile != null && String(profile.id) === String(state.currentUser.id);
  // Real connection status (6.3, connections/getInfo) — undefined/anything
  // other than "ACCEPTED" means no accepted connection exists yet, confirmed
  // live (an unconnected account's getInfo call comes back with no `status`
  // at all, not an error). Chat only makes sense once accepted; otherwise
  // this is a not-yet-connected profile, so offer Send Request instead —
  // same LinkedIn-style "view profile, then connect" flow as tapping a
  // result used to give from the old List/Map card.
  const isConnected = profile?.connectionStatus === "ACCEPTED";

  useEffect(() => {
    let cancelled = false;
    if (!profile) setLoading(true);

    // Always fetch fresh (6.3, connections/getInfo) rather than trusting a
    // pre-populated `profile` from navigation state alone — Search/My
    // Connections pass mapMentorSummary/mapAcceptedConnection objects,
    // neither of which carries `connectionStatus` (only getConnectionInfo's
    // mapping does), so it has to come from here for Chat vs Send Request
    // to render correctly regardless of which screen linked here.
    getConnectionInfo(userId)
      .then((data) => {
        if (cancelled || !data) return;
        setProfile((prev) =>
          prev ? { ...prev, connectionStatus: data.connectionStatus } : data,
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // getConnectionInfo (above) never carries `roomId` (only mapAcceptedConnection
  // does — see connectionsService.js) — if this profile arrived via a path
  // other than My Connections (e.g. Search), `isConnected` can already be
  // true here while `roomId` is still missing. Recommend Learning needs a
  // real room to notify through, so recover it the same way Chat.jsx does
  // when it's missing: look it up from the real accepted-connections list.
  useEffect(() => {
    if (!isConnected || profile?.roomId || !profile?.id) return;
    let cancelled = false;
    getMyConnections()
      .then((list) => {
        if (cancelled) return;
        const match = list.find((c) => String(c.id) === String(profile.id));
        if (match?.roomId)
          setProfile((prev) =>
            prev ? { ...prev, roomId: match.roomId } : prev,
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, profile?.id, profile?.roomId]);

  // Same real-chat navigation as the Chat button on ConnectionCard in My
  // Connections (MyConnections.jsx) — this used to open WhatsApp, a leftover
  // from before real chat was integrated.
  function handleChatClick(connection) {
    navigate(`/peer-connect/chat/${connection.id}`, { state: { connection } });
  }

  async function handleSendRequest(connection) {
    setRequestState("sending");
    setRequestError("");
    try {
      const response = await initiateConnection(
        connection.id,
        DEFAULT_CONNECT_MESSAGE,
      );
      if (response?.status === "REQUESTED") {
        setRequestState("sent");
      } else {
        setRequestState("error");
        setRequestError(
          response?.message || "Could not send the request. Please try again.",
        );
      }
    } catch (err) {
      setRequestState("error");
      setRequestError(err.message);
    }
  }

  return (
    <div className="profile-page">
      <button
        className="profile-page__back"
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <ChevronLeftIcon />
      </button>

      {loading && <p className="page-status">Loading profile…</p>}
      {!loading && !profile && (
        <p className="page-status">This profile isn't available right now.</p>
      )}

      {profile && (
        <>
          <ConnectionCard
            connection={profile}
            onChatClick={
              isOwnProfile || !isConnected ? undefined : handleChatClick
            }
            onSendRequest={
              isOwnProfile || isConnected ? undefined : handleSendRequest
            }
            requestState={requestState}
            requestError={requestError}
            avatarColor={isOwnProfile ? "var(--color-primary)" : undefined}
          />

          <CollapsibleSection title="Peer Information" defaultOpen>
            <ProfileField label="About" icon={InfoIcon}>
              {profile.about}
            </ProfileField>
            <ProfileField label="Location" icon={LocationPinIcon}>
              {profile.location}
            </ProfileField>
            <ProfileField label="Area of Expertise" icon={PersonCheckIcon}>
              {profile.areasOfExpertise}
            </ProfileField>
            <ProfileField
              label="Education Qualification"
              icon={GraduationCapIcon}
            >
              {profile.educationQualification}
            </ProfileField>
            {!profile.about &&
              !profile.location &&
              !profile.areasOfExpertise?.length &&
              !profile.educationQualification && (
                <p className="page-status">
                  No further profile details shared yet.
                </p>
              )}
          </CollapsibleSection>

          {/* Mentor -> mentee only: hidden on your own profile, on anyone not yet
              an accepted connection, and entirely for Thandi (the demo's
              beginner persona), regardless of whose profile she's viewing. */}
          {!isOwnProfile &&
            isConnected &&
            String(state.currentUser.id) !== THANDI_USER_ID && (
              <RecommendLearningPanel
                mentor={state.currentUser}
                mentee={profile}
              />
            )}
        </>
      )}
    </div>
  );
}
