import { parseInboundInsight } from "../insight";

describe("parseInboundInsight", () => {
  it("extracts appointment date from call summary and time from Appointment_Time", () => {
    const parsed = parseInboundInsight(
      {
        call_summary:
          "Art called to schedule an interview for a warehouse picker position. The agent confirmed Art's work authorization and experience, then scheduled the interview with Mrs. Jennifer for Friday, June 5th, 2026 at 10:15 AM after the originally requested time was unavailable.",
        call_successful: true,
        user_sentiment: "Positive",
        custom_analysis_data: {
          Client_Name: "Art Caines",
          Client_phone: 6302126989,
          Appointment_Date: 6062026,
          Appointment_Time: 1015,
          Reason_Call: "Art called to schedule an interview for the warehouse picker position.",
          client_email: "art_caines@yahoo.com",
        },
      },
      null
    );

    expect(parsed.clientName).toBe("Art Caines");
    expect(parsed.clientPhone).toBe("(630) 212-6989");
    expect(parsed.clientEmail).toBe("art_caines@yahoo.com");
    expect(parsed.reasonForCall).toContain("warehouse picker");
    expect(parsed.callSuccessful).toBe(true);
    expect(parsed.userSentiment).toBe("Positive");
    expect(parsed.appointment.dateLabel).toContain("June");
    expect(parsed.appointment.dateLabel).toContain("2026");
    expect(parsed.appointment.timeLabel).toContain("10:15");
    expect(parsed.appointment.dateTimeLabel).toContain("2026");
  });

  it("keeps the parsed time even when no date can be extracted from the summary", () => {
    const parsed = parseInboundInsight(
      {
        call_summary: "Candidate called to ask about the role and requested a callback.",
        custom_analysis_data: {
          Appointment_Date: 6062026,
          Appointment_Time: "0915",
        },
      },
      null
    );

    expect(parsed.appointment.dateLabel).toBeNull();
    expect(parsed.appointment.timeLabel).toContain("9:15");
  });
});
