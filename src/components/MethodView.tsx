import { useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CalendarClock,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  Database,
  ExternalLink,
  ListFilter,
} from "lucide-react";
import type { Meta } from "../api";
import { dateLabel, number } from "../format";
import { Glossary, Icon, KeyFinding } from "./ui";
import { useMetaQuery } from "../query";
import { QueryControls } from "./QueryControls";

export default function MethodView({
  meta,
  cutoff,
}: {
  meta: Meta | null;
  cutoff: string;
}) {
  const metadata = useMetaQuery();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const copy = async () => {
    if (!meta) return;
    try {
      await navigator.clipboard.writeText(meta.database_sha256);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(
        "Clipboard unavailable. Select the full checksum below to copy it.",
      );
    }
  };
  const steps = [
    {
      title: "Define the buying decision",
      body: (
        <>
          <p>
            Decision dates are 1–31 January 2026. Each decision targets the
            following calendar day, so delivery runs from 2 January–1 February
            2026.
          </p>
          <p>
            Controls use Europe/London; January is GMT. The default 09:30 cutoff
            is an illustrative internal decision time, not a universal GB
            auction deadline.
          </p>
        </>
      ),
    },
    {
      title: "Select only eligible publications",
      body: (
        <>
          <p>
            For each target timestamp, choose the latest source forecast
            published no later than the decision cutoff. Later updates cannot
            enter an earlier replay.
          </p>
          <div className="formula-block">
            <span>Selection rule</span>
            <code>max(publishTime) where publishTime ≤ cutoff</code>
          </div>
          <p>
            Publication time is a proxy for availability. A retrospective
            download cannot prove when a client’s system received a forecast.
          </p>
        </>
      ),
    },
    {
      title: "Match exact timestamps",
      body: (
        <>
          <p>
            Use WINDFOR forecasts and FUELHH actuals with fuelType WIND. In this
            snapshot, forecast timestamps are hourly; actuals are half-hourly.
          </p>
          <p>
            Only identical startTime values are paired. Missing values remain
            missing. No interpolation, forward filling, or fabricated :30
            forecasts are used.
          </p>
          <p>
            This is a timestamp-matched MW comparison, not a full half-hour
            energy backtest. Source coverage and averaging semantics can
            contribute to differences, so scores do not isolate weather-model
            error.
          </p>
        </>
      ),
    },
    {
      title: "Measure error magnitude and direction",
      body: (
        <>
          <p>
            Positive error means forecast wind was too high, creating potential
            under-buying exposure. Negative error means wind was underforecast.
          </p>
          <div className="formula-block">
            <span>Signed error, in MW</span>
            <code>error = forecast − actual</code>
          </div>
          <div className="worked-example">
            <strong>Worked example</strong>
            <p>
              Forecast 2,000 MW − actual 1,500 MW ={" "}
              <strong className="semantic-over">+500 MW</strong>.
            </p>
            <p>
              Forecast too high → less wind arrived → potential risk of buying
              too little other electricity.
            </p>
          </div>
          <p>
            A zero average bias can conceal large positive and negative errors
            that cancel.
          </p>
        </>
      ),
    },
    {
      title: "Keep hindsight separate",
      body: (
        <>
          <p>
            The accuracy view and revealed outcomes use the latest actual
            publication retrieved in the snapshot.
          </p>
          <p>
            Earlier-error context uses only previous January decisions and
            actual publications available by the current replay cutoff. The
            selected day’s outcome stays hidden until explicitly revealed.
          </p>
          <p>
            Historical percentiles describe this sample; they are not calibrated
            future probabilities or guaranteed error ranges.
          </p>
        </>
      ),
    },
    {
      title: "Use the result within its scope",
      body: (
        <>
          <p>
            The app evaluates Elexon’s existing forecasts; it does not train a
            prediction model or place a trade.
          </p>
          <p>
            National wind uncertainty supports a buyer’s judgement. Order sizing
            also requires client demand, contracts, and portfolio exposure,
            which are excluded from the assignment.
          </p>
          <p>
            Elexon’s Great Britain wind coverage should not be interpreted as
            every UK wind installation. No savings or trading outcomes are
            claimed.
          </p>
        </>
      ),
    },
  ];
  return (
    <>
      <QueryControls query={metadata} />
      <KeyFinding>
        Each delivery timestamp uses the{" "}
        <strong>latest forecast published by the decision cutoff</strong>. Only
        exact forecast/actual timestamp matches are scored.
        {meta && (
          <>
            {" "}
            The snapshot preserves{" "}
            <strong>{number(meta.forecast_rows)} forecast versions</strong> for
            audit.
          </>
        )}
      </KeyFinding>
      <section className="panel primary-panel timeline-panel">
        <div className="section-heading">
          <div>
            <h2>From forecast publication to measured error</h2>
            <p>
              The buying decision uses information available before delivery,
              not later updates.
            </p>
          </div>
        </div>
        <ol className="timeline">
          <li>
            <span className="timeline-icon">
              <Icon icon={BookOpenText} />
            </span>
            <strong>Forecast published</strong>
            <span>Source publishTime</span>
            <Icon icon={ArrowRight} size={18} />
          </li>
          <li className="timeline-cutoff">
            <span className="timeline-icon">
              <Icon icon={CalendarClock} />
            </span>
            <strong>{cutoff} GMT cutoff</strong>
            <span>Buying decision</span>
            <Icon icon={ArrowRight} size={18} />
          </li>
          <li>
            <span className="timeline-icon">
              <Icon icon={Clock3} />
            </span>
            <strong>Delivery day</strong>
            <span>Next-day target interval</span>
            <Icon icon={ArrowRight} size={18} />
          </li>
          <li>
            <span className="timeline-icon">
              <Icon icon={Database} />
            </span>
            <strong>Actuals published</strong>
            <span>Outcome can be evaluated</span>
          </li>
        </ol>
        <div className="timeline-rule">
          <Icon icon={ListFilter} size={18} />
          <code>latest publishTime ≤ cutoff</code>
          <span>applied independently to each target timestamp</span>
        </div>
      </section>
      <section className="formula-section">
        <h2>What each accuracy measure means</h2>
        <p>
          All formulas use matched observations. Missing pairs are excluded and
          reported.
        </p>
        <div className="formula-grid">
          <article className="panel formula-card">
            <h3>
              <Glossary term="MAE" /> · typical magnitude
            </h3>
            <p>Average size of the miss, regardless of its direction.</p>
            <div className="formula-block">
              <code>mean(|error|)</code>
            </div>
          </article>
          <article className="panel formula-card">
            <h3>
              <Glossary term="RMSE" /> · larger misses
            </h3>
            <p>Gives large forecast errors more influence on the score.</p>
            <div className="formula-block">
              <code>√mean(error²)</code>
            </div>
          </article>
          <article className="panel formula-card">
            <h3>
              <Glossary term="Bias" /> · signed tendency
            </h3>
            <p>
              Shows whether wind was overforecast or underforecast on average.
            </p>
            <div className="formula-block">
              <code>mean(error)</code>
            </div>
          </article>
          <article className="panel formula-card">
            <h3>
              <Glossary term="WAPE" /> · relative magnitude
            </h3>
            <p>Total absolute error relative to matched actual generation.</p>
            <div className="formula-block">
              <code>100 × Σ|error| / Σactual</code>
            </div>
            <p className="caption">
              Undefined when total matched actual is zero.
            </p>
          </article>
          <article className="panel formula-card">
            <h3>
              <Glossary term="P90" /> · historical threshold
            </h3>
            <p>
              90% of observed absolute errors are at or below this magnitude.
            </p>
            <div className="formula-block">
              <code>90th percentile of |error|</code>
            </div>
            <p className="caption">
              Linear interpolation between ordered error observations.
            </p>
          </article>
        </div>
        <p className="caption">
          Pooled scores use all matched observations, not averages of rounded
          daily scores. The January sample is short and observations can be
          correlated.
        </p>
      </section>
      <section className="method-section">
        <h2>Selection and evaluation, step by step</h2>
        <div className="method-steps">
          {steps.map((step, index) => (
            <details className="panel method-step" open key={step.title}>
              <summary>
                <span className="step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <Icon icon={ChevronRight} size={18} />
              </summary>
              <div className="step-body">{step.body}</div>
            </details>
          ))}
        </div>
      </section>
      <section className="panel source-panel">
        <h2>Source and snapshot</h2>
        <p>Real Elexon source data, preserved in an immutable snapshot.</p>
        <div className="snapshot-stats">
          <div>
            <strong>{number(meta?.forecast_rows)}</strong>
            <span>forecast versions</span>
          </div>
          <div>
            <strong>{number(meta?.actual_rows)}</strong>
            <span>actual versions</span>
          </div>
          <div>
            <strong>{number(meta?.source_requests)}</strong>
            <span>source requests</span>
          </div>
        </div>
        <dl className="snapshot-meta">
          <div>
            <dt>Retrieved</dt>
            <dd>{meta ? dateLabel(meta.retrieved_at) : "Not available"}</dd>
          </div>
          <div>
            <dt>Database SHA-256</dt>
            <dd>
              <code className="checksum">
                {meta?.database_sha256 ?? "Snapshot metadata unavailable"}
              </code>
              <button
                className="button secondary"
                onClick={copy}
                disabled={!meta}
                aria-label="Copy full database checksum"
                title="Copy SHA-256 checksum"
              >
                <Icon icon={copied ? Check : Clipboard} size={18} />
                {copied ? "Copied" : "Copy checksum"}
              </button>
            </dd>
          </div>
        </dl>
        {copyError && <p role="status">{copyError}</p>}
        {copied && (
          <span role="status" className="sr-only">
            Checksum copied to clipboard.
          </span>
        )}
        <div className="source-links">
          <a
            href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
            target="_blank"
            rel="noreferrer"
          >
            WINDFOR documentation
            <Icon icon={ExternalLink} size={18} />
          </a>
          <a
            href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
            target="_blank"
            rel="noreferrer"
          >
            FUELHH documentation
            <Icon icon={ExternalLink} size={18} />
          </a>
        </div>
      </section>
    </>
  );
}
