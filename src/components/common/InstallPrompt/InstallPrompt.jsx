import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="install-prompt">
      <span>Add Elevate to your home screen for quick, app-like access.</span>
      <div className="install-prompt__actions">
        <button className="install-prompt__install-btn" onClick={promptInstall}>
          Install
        </button>
        <button className="install-prompt__dismiss-btn" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
