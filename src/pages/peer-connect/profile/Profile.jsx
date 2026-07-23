import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../assets/icons';
import ConnectionCard from '../../../components/ConnectionCard/ConnectionCard';
import { getConnectionInfo } from '../../../services/connectionsService';
import '../../../styles/pages/profile.css';

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

function ProfileField({ label, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="profile-field">
      <span className="profile-field__label">{label}</span>
      <p className="profile-field__value">{Array.isArray(children) ? children.join(', ') : children}</p>
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(location.state?.profile ?? null);
  const [loading, setLoading] = useState(!location.state?.profile);

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
          <ConnectionCard connection={profile} onChatClick={handleChatClick} />

          <CollapsibleSection title="Peer Information" defaultOpen>
            <ProfileField label="About">{profile.about}</ProfileField>
            <ProfileField label="Years of Experience">
              {profile.experience ? `${profile.experience} years` : ''}
            </ProfileField>
            <ProfileField label="Designation">{profile.designations}</ProfileField>
            <ProfileField label="Area of Expertise">{profile.areasOfExpertise}</ProfileField>
            <ProfileField label="Organization">{profile.organization}</ProfileField>
            <ProfileField label="Education Qualification">{profile.educationQualification}</ProfileField>
            {!profile.about &&
              !profile.experience &&
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
