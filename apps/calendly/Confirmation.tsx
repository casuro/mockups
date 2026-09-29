import { Avatar, LocationIcon, Meta, useUI } from "./context";
import { whenText } from "./format";
import * as I from "./icons";

// "You are scheduled": the booking just made, and a way to book another.

export function Confirmation() {
  const { calendly } = useUI();
  const { seed, booking, ui } = calendly;
  if (!booking) return null;
  const { event } = seed;
  const zone = seed.timeZones.find((z) => z.id === booking.timeZone);

  return (
    <div className="done">
      <Avatar />
      <h1>
        <I.Check />
        You are scheduled
      </h1>
      <p className="sub">A calendar invitation has been sent to your email address.</p>
      <div className="summary">
        <div className="ev">{event.name}</div>
        <Meta icon={<I.User />}>{seed.host.name}</Meta>
        <Meta icon={<I.Calendar />}>{whenText(booking.day, calendly.localMinutes(booking.day, booking.time, booking.timeZone), event.duration)}</Meta>
        <Meta icon={<I.GlobeLarge />}>{zone?.label ?? booking.timeZone}</Meta>
        <Meta icon={<LocationIcon />}>{event.locationNote ?? "Web conferencing details to follow."}</Meta>
      </div>
      <button className="again" onClick={ui.again}>
        Schedule another event
      </button>
    </div>
  );
}
