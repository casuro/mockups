import { Avatar, LocationIcon, Meta, useUI } from "./context";
import { whenText } from "./format";
import * as I from "./icons";

// The left side of the card: who and what is being booked. While picking a
// time it shows the description; on Enter Details, the Back button and the
// time picked.

export function HostPanel() {
  const { calendly } = useUI();
  const { seed, state, zone } = calendly;
  const { event } = seed;
  const details = state.step === "details";

  return (
    <div className="left">
      {details ? (
        <button className="back" aria-label="Back" onClick={calendly.ui.back}>
          <I.Back />
        </button>
      ) : null}
      <Avatar />
      <div className="host">{seed.host.name}</div>
      <h1 className="ev">{event.name}</h1>
      <Meta icon={<I.Clock />}>{event.duration} min</Meta>
      <Meta icon={<LocationIcon />}>{event.location ?? "Google Meet"}</Meta>
      {details && state.day && state.slot ? (
        <>
          <Meta icon={<I.Calendar />} className="when">
            {whenText(state.day, calendly.localMinutes(state.day, state.slot), event.duration)}
          </Meta>
          <Meta icon={<I.GlobeLarge />}>{zone.label}</Meta>
        </>
      ) : event.description ? (
        <p className="desc">{event.description}</p>
      ) : null}
    </div>
  );
}
