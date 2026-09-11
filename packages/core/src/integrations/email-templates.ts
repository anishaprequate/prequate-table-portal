// Plain-text email templates. Each takes already-formatted display values
// (dates, names) rather than raw data, so this file stays free of any
// date-formatting or DB logic — that stays with the calling app, which
// already has its own formatSlot-style helpers.

export function bookingConfirmedEmail(params: {
  partnerName: string;
  whenLabel: string;
  memberContext?: string | null;
}): { subject: string; text: string } {
  const lines = [`Your Hour with ${params.partnerName} is confirmed for ${params.whenLabel}.`];
  if (params.memberContext) {
    lines.push("", `What you shared ahead of the session: "${params.memberContext}"`);
  }
  lines.push("", "You can reschedule or cancel any time from The Prequate Table.");

  return {
    subject: `Your Hour with ${params.partnerName} is confirmed`,
    text: lines.join("\n"),
  };
}

export function bookingReminderEmail(params: {
  partnerName: string;
  whenLabel: string;
}): { subject: string; text: string } {
  return {
    subject: "Your Hour session is tomorrow",
    text: `A reminder that your Hour with ${params.partnerName} is scheduled for ${params.whenLabel}.`,
  };
}

export function magicLinkEmail(params: { link: string }): { subject: string; text: string } {
  return {
    subject: "Sign in to The Prequate Table",
    text: `Tap below to sign in. This link is valid for 15 minutes and works once.\n\n${params.link}\n\nDidn't request this? You can ignore this email.`,
  };
}

export function eventSurveyEmail(params: { eventTitle: string; link: string }): { subject: string; text: string } {
  return {
    subject: `How was ${params.eventTitle}?`,
    text: `We'd love a minute of your thoughts on ${params.eventTitle}.\n\n${params.link}`,
  };
}

export function eventSurveyReminderEmail(params: {
  eventTitle: string;
  link: string;
}): { subject: string; text: string } {
  return {
    subject: `Still time to rate ${params.eventTitle}`,
    text: `A quick reminder — we'd still love your take on ${params.eventTitle}, if you have a minute.\n\n${params.link}`,
  };
}
