import { HourglassIcon } from '../../assets/icons';
import '../../styles/components/coming-soon.css';

export default function ComingSoon({ title, description }) {
  return (
    <div className="coming-soon">
      <HourglassIcon className="coming-soon__icon" />
      <p className="coming-soon__title">{title}</p>
      {description && <p className="coming-soon__description">{description}</p>}
    </div>
  );
}
