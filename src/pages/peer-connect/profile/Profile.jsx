import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../assets/icons';
import ConnectionCard from '../../../components/ConnectionCard/ConnectionCard';
import InfoTooltip from '../../../components/InfoTooltip/InfoTooltip';
import { useAppState } from '../../../context/AppStateContext';
import { getConnectionInfo } from '../../../services/connectionsService';
import '../../../styles/pages/profile.css';

// Confirmed definitions (ARCHITECTURE_UPDATE_POST_CALL.md, Section 2.1) — the
// copy is final even though the fields themselves aren't live from Elevate
// yet, so it ships now and needs no changes once the fields appear.
const ELP_TYPE_INFO =
  'Centre-Based: crèches and preschools — more than 6 children attending, run in a fixed location, ' +
  'children spend more than 16 hours/week at the space.\n\n' +
  'Non-Centre-Based: childminders, playgroups, toy libraries, mobile programmes — 6 or fewer children ' +
  'at once, may be a mobile space (e.g. a travelling truck).';

const ELP_TIER_INFO =
  'Awarded by government based on certifications and achievements — not self-selected.\n\n' +
  'Pre-Bronze: haven’t set up or registered yet.\n' +
  'Bronze: granted upon initial application submission — entry-level recognition, assigns a unique ' +
  'National ECD Identifier Number.\n' +
  'Silver: awarded after site visits by social workers or Environmental Health Practitioners (EHPs), ' +
  'verifying baseline health, safety, and practitioner capability.\n' +
  'Gold: granted when higher-level infrastructure, compliance, and qualification standards are met.';

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card profile-section">
      <button className="profile-section__header" onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <ChevronRightIcon style={{ transform: `rotate(${open ? -90 : 90}deg)` }} />
      </button>
      {open && <div className="profile-section__body">{children}</div>}
    </div>
  );
}

function ProfileField({ label, tooltip, tooltipLabel, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="profile-field">
      <span className="profile-field__label">
        {label}
        {tooltip && <InfoTooltip label={tooltipLabel || `About ${label}`} text={tooltip} />}
      </span>
      <p className="profile-field__value">{Array.isArray(children) ? children.join(', ') : children}</p>
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
  const isOwnProfile = profile != null && String(profile.id) === String(state.currentUser.id);

  useEffect(() => {
    if (profile) return;
    let cancelled = false;
    getConnectionInfo(userId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, profile]);

  function handleChatClick(connection) {
    const phoneQuery = encodeURIComponent(connection.name);
    window.open(`https://wa.me/?text=${phoneQuery}`, '_blank', 'noreferrer');
  }

  return (
    <div className="profile-page">
      <button className="profile-page__back" onClick={() => navigate(-1)} aria-label="Back">
        <ChevronLeftIcon />
      </button>

      {loading && <p className="page-status">Loading profile…</p>}
      {!loading && !profile && <p className="page-status">This profile isn't available right now.</p>}

      {profile && (
        <>
          <ConnectionCard
            connection={profile}
            onChatClick={isOwnProfile ? undefined : handleChatClick}
            avatarColor={isOwnProfile ? 'var(--color-primary)' : undefined}
          />

          <CollapsibleSection title="Peer Information" defaultOpen>
            <ProfileField label="About">{profile.about}</ProfileField>
            <ProfileField label="Location">{profile.location}</ProfileField>
            <ProfileField label="Years of Experience">
              {profile.experience ? `${profile.experience} years` : ''}
            </ProfileField>
            <ProfileField label="ELP Type" tooltip={ELP_TYPE_INFO} tooltipLabel="What is ELP Type?">
              {profile.elpType}
            </ProfileField>
            <ProfileField label="ELP Tier" tooltip={ELP_TIER_INFO} tooltipLabel="What is ELP Tier?">
              {profile.elpTier}
            </ProfileField>
            <ProfileField label="Designation">{profile.designations}</ProfileField>
            <ProfileField label="Area of Expertise">{profile.areasOfExpertise}</ProfileField>
            <ProfileField label="Organization">{profile.organization}</ProfileField>
            <ProfileField label="Education Qualification">{profile.educationQualification}</ProfileField>
            {!profile.about &&
              !profile.location &&
              !profile.experience &&
              !profile.elpType &&
              !profile.elpTier &&
              !profile.designations?.length &&
              !profile.areasOfExpertise?.length &&
              !profile.organization &&
              !profile.educationQualification && (
                <p className="page-status">No further profile details shared yet.</p>
              )}
          </CollapsibleSection>

          <CollapsibleSection title="Peer Reviews">
            {profile.rating ? <p className="profile-field__value">{profile.rating}</p> : (
              <p className="page-status">No reviews yet.</p>
            )}
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
