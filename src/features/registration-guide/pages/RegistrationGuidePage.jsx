import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, BadgeTierIcon, HourglassIcon, RegistrationGuideIcon } from '@/assets/icons';
import { triggerJourneyRequest, pollForJourney } from '@/services/journeyService';
import './RegistrationGuidePage.css';

const TIERS = ['Pre-bronze', 'Bronze', 'Silver', 'Gold'];

// Simple rule-based fallback for the "Skip" path -- no AI, no Beckn, just
// a fixed step list keyed by current tier. Matches the spec's "skip ->
// standard journey based on current state" exactly.
const STANDARD_JOURNEYS = {
  'Pre-bronze': {
    summary: 'The standard path from Pre-bronze to Bronze registration.',
    steps: [
      { title: 'Complete basic ECD orientation training', description: 'A short, accredited course covering fundamentals of early childhood care.' },
      { title: 'Pass a home/centre safety check', description: 'Confirm your space meets minimum safety and hygiene requirements.' },
      { title: 'Register with local authorities', description: 'Complete the standard municipal/provincial registration paperwork.' },
      { title: 'Submit your Bronze application', description: 'Submit your documents for Bronze tier review.' },
    ],
  },
  Bronze: {
    summary: 'The standard path from Bronze to Silver.',
    steps: [
      { title: 'Complete intermediate ECD training', description: 'Build on your Bronze-level training with a more advanced course.' },
      { title: 'Demonstrate 6+ months of active operation', description: 'Silver requires an established track record.' },
      { title: 'Submit updated documentation', description: 'Provide updated safety/registration records.' },
    ],
  },
  Silver: {
    summary: 'The standard path from Silver to Gold.',
    steps: [
      { title: 'Complete advanced ECD certification', description: 'Gold requires the highest level of formal training.' },
      { title: 'Mentor another practitioner', description: 'Gold-tier practitioners are expected to support others in the network.' },
      { title: 'Submit for final Gold review', description: 'A more thorough assessment than earlier tiers.' },
    ],
  },
  Gold: {
    summary: "You're already at the top tier!",
    steps: [{ title: 'Consider mentoring others', description: 'Share your experience with practitioners still working toward Gold.' }],
  },
};

const STEP = {
  GOAL: 'goal',
  PROMPT: 'prompt',
  ASSESSMENT: 'assessment',
  LOADING: 'loading',
  READY_PROMPT: 'ready_prompt',
  RESULTS: 'results',
  ERROR: 'error',
};

export default function RegistrationGuidePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.GOAL);
  const [goal, setGoal] = useState('');
  const [timeframeValue, setTimeframeValue] = useState('');
  const [timeframeUnit, setTimeframeUnit] = useState('months');
  const [currentTier, setCurrentTier] = useState('Pre-bronze');
  const [assessment, setAssessment] = useState('');
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState('');

  function handleGoalSubmit(e) {
    e.preventDefault();
    if (!goal.trim()) return;
    setStep(STEP.PROMPT);
  }

  function handleSkip() {
    setJourney(STANDARD_JOURNEYS[currentTier] || STANDARD_JOURNEYS['Pre-bronze']);
    setStep(STEP.RESULTS);
  }

  async function handleAssessmentSubmit(e) {
    e.preventDefault();
    setStep(STEP.LOADING);
    setError('');
    try {
      const timeframe = timeframeValue ? `${timeframeValue} ${timeframeUnit}` : '';
      await triggerJourneyRequest({ goal, timeframe, currentTier, assessment });
      const result = await pollForJourney();
      setJourney(result);
      setStep(STEP.READY_PROMPT);
    } catch (err) {
      setError(err.message || 'Something went wrong generating your journey.');
      setStep(STEP.ERROR);
    }
  }

  return (
    <div className="registration-guide-page">
      <button className="registration-guide-page__back" onClick={() => navigate(-1)} aria-label="Back">
        <ChevronLeftIcon />
      </button>

      <div className="registration-guide-page__header">
        <RegistrationGuideIcon />
        <h1>My Registration Guide</h1>
      </div>

      {step === STEP.GOAL && (
        <form className="card registration-guide-page__form" onSubmit={handleGoalSubmit}>
          <h2>What's your goal?</h2>
          <label className="registration-guide-page__field">
            <span>What do you want to achieve?</span>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Apply for Bronze certification"
              required
            />
          </label>

          <label className="registration-guide-page__field">
            <span>Approximately by when? (optional)</span>
            <div className="registration-guide-page__timeframe">
              <input
                type="number"
                min="1"
                value={timeframeValue}
                onChange={(e) => setTimeframeValue(e.target.value)}
                placeholder="3"
              />
              <select value={timeframeUnit} onChange={(e) => setTimeframeUnit(e.target.value)}>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </div>
          </label>

          <label className="registration-guide-page__field">
            <span>Where are you currently?</span>
            <div className="registration-guide-page__tiers">
              {TIERS.map((tier) => (
                <button
                  type="button"
                  key={tier}
                  className={
                    'registration-guide-page__tier-btn' +
                    (currentTier === tier ? ' registration-guide-page__tier-btn--active' : '')
                  }
                  onClick={() => setCurrentTier(tier)}
                >
                  <BadgeTierIcon />
                  {tier}
                </button>
              ))}
            </div>
          </label>

          <button type="submit" className="btn-primary" disabled={!goal.trim()}>
            Continue
          </button>
        </form>
      )}

      {step === STEP.PROMPT && (
        <div className="card registration-guide-page__prompt">
          <p>I can help customize your journey to your goal. Would you like to answer some questions so that I can do so?</p>
          <div className="registration-guide-page__prompt-actions">
            <button className="btn-primary" onClick={() => setStep(STEP.ASSESSMENT)}>
              Sure!
            </button>
            <button className="btn-secondary" onClick={handleSkip}>
              Skip →
            </button>
          </div>
        </div>
      )}

      {step === STEP.ASSESSMENT && (
        <form className="card registration-guide-page__form" onSubmit={handleAssessmentSubmit}>
          <h2>Tell us about your current setup</h2>
          <label className="registration-guide-page__field">
            <span>What's your current setup like? (e.g. how many children, home-based or a separate space, any training so far)</span>
            <textarea
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              rows={5}
              placeholder="Tell us as much as you can -- it helps us build a more accurate plan for you."
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={!assessment.trim()}>
            Evaluate &amp; Customize
          </button>
        </form>
      )}

      {step === STEP.LOADING && (
        <div className="card registration-guide-page__loading">
          <HourglassIcon className="registration-guide-page__loading-icon" />
          <p>Building your custom journey…</p>
          <p className="registration-guide-page__loading-hint">This usually takes a few seconds.</p>
        </div>
      )}

      {step === STEP.READY_PROMPT && (
        <div className="card registration-guide-page__prompt">
          <p>I have a custom journey for you!</p>
          <button className="btn-primary" onClick={() => setStep(STEP.RESULTS)}>
            Great! Show me
          </button>
        </div>
      )}

      {step === STEP.RESULTS && journey && (
        <div className="registration-guide-page__results">
          <div className="card registration-guide-page__summary">
            <h2>My Journey</h2>
            <p>{journey.summary}</p>
          </div>
          <ol className="registration-guide-page__steps">
            {journey.steps.map((s, i) => (
              <li key={i} className="card registration-guide-page__step">
                <span className="registration-guide-page__step-number">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {step === STEP.ERROR && (
        <div className="card registration-guide-page__error">
          <p>{error}</p>
          <button className="btn-primary" onClick={() => setStep(STEP.GOAL)}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
