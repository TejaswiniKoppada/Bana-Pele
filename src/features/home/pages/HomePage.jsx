import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RegistrationGuideIcon,
  LearningIcon,
  PeerConnectIcon,
  CommunityVoicesIcon,
  BadgeTierIcon,
  ChevronRightIcon,
} from "../../../assets/icons";
import { useAppState } from "../../../app/providers/AppStateProvider";
import { getConnectionInfo } from "../../connections/api/connections.api";
import { initialsForName } from "../../../utils/formatters";
import { formatDate } from "../../../utils/date";
import "./HomePage.css";

const MENU_ITEMS = [
  {
    label: "My Registration Guide",
    to: null,
    Icon: RegistrationGuideIcon,
    enabled: false,
  },
  {
    label: "My Learning",
    to: "/my-learning",
    Icon: LearningIcon,
    enabled: true,
  },
  {
    label: "Community Connect",
    to: "/peer-connect",
    Icon: PeerConnectIcon,
    enabled: true,
  },
  {
    label: "Community Voices",
    to: "/community-voices",
    Icon: CommunityVoicesIcon,
    enabled: true,
  },
];

// TEMPORARY DEMO OVERRIDES — real data always takes priority (see where
// `ownProfile.elpTier` / `ownProfile.image` are checked first below); these
// only fill in for the two known demo accounts, for fields Elevate doesn't
// have live yet (ELP Tier) or hasn't been given a photo for (avatar). Delete
// an account's entry (or the whole object) once the real field/data exists —
// nothing else needs to change.
const TEMP_DEMO_OVERRIDES = {
  "mentorbanapele1@yopmail.com": { tier: "Gold", avatar: "/images/maria.jpg" },
  "banad@yopmail.com": { tier: "Pre-Bronze", avatar: "/images/thandi.jpg" },
};

export default function Home() {
  const { state } = useAppState();
  const { currentUser } = state;
  const navigate = useNavigate();
  // Real designation/tier/photo, fetched the same way About view (Profile.jsx)
  // does for anyone else's profile — connections/getInfo works for a
  // self-lookup too (it just replies "Connection not found" alongside the
  // real user_details).
  const [ownProfile, setOwnProfile] = useState(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConnectionInfo(currentUser.id)
      .then((data) => {
        if (!cancelled) setOwnProfile(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  // `tagline` (see connectionsService.js's withDemoTagline) is the curated
  // display label for the 5 non-Thandi demo accounts, e.g. "Gold Tier ELP
  // Practitioner" for Maria rather than her real, less presentable Elevate
  // designation ("Head master") — takes priority over the raw designations
  // list here for exactly the same reason ConnectionCard prefers it.
  const designation =
    ownProfile?.tagline ||
    (ownProfile?.designations?.length
      ? ownProfile.designations.join(", ")
      : "");
  const demoOverride = TEMP_DEMO_OVERRIDES[currentUser.email] || {};
  const tier = ownProfile?.elpTier || demoOverride.tier;
  const avatarImage = ownProfile?.image || demoOverride.avatar;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarImage]);

  function handleOpenOwnProfile() {
    navigate(
      `/peer-connect/profile/${currentUser.id}`,
      ownProfile ? { state: { profile: ownProfile } } : undefined,
    );
  }

  return (
    <div>
      <div className="card profile-card">
        <button
          type="button"
          className="profile-card__identity"
          onClick={handleOpenOwnProfile}
          aria-label={`View ${currentUser.name}'s details`}
        >
          {avatarImage && !avatarLoadFailed ? (
            <img
              className="card__avatar card__avatar--photo"
              src={avatarImage}
              alt=""
              style={{ width: 56, height: 56 }}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <div
              className="card__avatar"
              style={{
                background: "var(--color-primary)",
                width: 56,
                height: 56,
                fontSize: 20,
              }}
            >
              {initialsForName(currentUser.name)}
            </div>
          )}
          <div className="profile-card__body">
            <p className="profile-card__name">{currentUser.name}</p>
            {designation && <p className="profile-card__role">{designation}</p>}
          </div>
        </button>
        <div className="profile-card__joined">
          <span>Joined On:</span>
          <strong>{formatDate(currentUser.joinedOn)}</strong>
        </div>
      </div>

      <div className="progress-badge">
        <RegistrationGuideIcon className="progress-badge__icon" />
        <div className="progress-badge__info">
          <p className="progress-badge__name">NoName</p>
          <p className="progress-badge__location">NoLocation</p>
        </div>
        {tier && (
          <div className="progress-badge__tier">
            <BadgeTierIcon />
            <span>{tier}</span>
          </div>
        )}
      </div>

      <ul className="menu-list">
        {MENU_ITEMS.map(({ label, to, Icon, enabled }) => (
          <li key={label}>
            {enabled ? (
              <Link to={to} className="menu-list__item">
                <Icon />
                <span>{label}</span>
                <ChevronRightIcon className="menu-list__chevron" />
              </Link>
            ) : (
              <span
                className="menu-list__item menu-list__item--disabled"
                title="Not part of this phase"
              >
                <Icon />
                <span>{label}</span>
                <ChevronRightIcon className="menu-list__chevron" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
