"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

const DAY_START_HOUR = 8;

function scheduleToEvents(
  schedule: Record<string, { start_min: number; end_min: number; title?: string }>,
  date: Date,
  dayStartHour = DAY_START_HOUR,
  horizonStart?: string
): EventInput[] {
  const baseMs = horizonStart ? new Date(horizonStart).getTime() : null;
  return Object.entries(schedule).map(([taskId, slot]) => {
    let startIso: string;
    let endIso: string;
    if (baseMs !== null) {
      startIso = new Date(baseMs + slot.start_min * 60000).toISOString();
      endIso = new Date(baseMs + slot.end_min * 60000).toISOString();
    } else {
      const start = new Date(date);
      start.setHours(dayStartHour + Math.floor(slot.start_min / 60), slot.start_min % 60, 0);
      const end = new Date(date);
      end.setHours(dayStartHour + Math.floor(slot.end_min / 60), slot.end_min % 60, 0);
      startIso = start.toISOString();
      endIso = end.toISOString();
    }
    return {
      id: taskId,
      title: slot.title || taskId,
      start: startIso,
      end: endIso,
      extendedProps: { taskId },
    };
  });
}

interface ScheduleCalendarProps {
  schedule: Record<string, { start_min: number; end_min: number; title?: string }>;
  date?: Date;
  horizonStart?: string;
}

export function ScheduleCalendar({ schedule, date = new Date(), horizonStart }: ScheduleCalendarProps) {
  const router = useRouter();
  const events = useMemo(
    () => scheduleToEvents(schedule, date, DAY_START_HOUR, horizonStart),
    [schedule, date, horizonStart]
  );

  const handleEventClick = (taskId: string) => {
    router.push(`/workspace/${taskId}`);
  };

  return (
    <div className="schedule-calendar-wrapper rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-sm p-6 shadow-xl">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        initialDate={horizonStart ? new Date(horizonStart) : new Date()}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,dayGridWeek,dayGridMonth",
        }}
        events={events}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          const taskId = info.event.extendedProps.taskId as string;
          if (taskId) handleEventClick(taskId);
        }}
        eventContent={(arg) => {
          const fullTitle = arg.event.title ?? "";
          const startDate = arg.event.start;
          const endDate = arg.event.end;
          const durationMin = startDate && endDate
            ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
            : 0;
          const timeStr = startDate
            ? startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";
          const isDayGrid = arg.view.type.startsWith("dayGrid");

          if (isDayGrid) {
            return (
              <div
                className="fc-daygrid-event-custom"
                title={`${fullTitle} (${durationMin} min)`}
              >
                <span className="fc-daygrid-event-time">{timeStr}</span>
                <span className="fc-daygrid-event-title">{fullTitle}</span>
              </div>
            );
          }

          return (
            <div className="fc-timegrid-event-custom" title={`${fullTitle} (${durationMin} min)`}>
              <div className="fc-timegrid-event-title">{fullTitle}</div>
              <div className="fc-timegrid-event-meta">
                {timeStr}
                {durationMin > 0 && <span className="fc-timegrid-event-dur"> · {durationMin}m</span>}
              </div>
            </div>
          );
        }}
        height="auto"
        contentHeight="auto"
        dayMaxEvents={false}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        slotLabelFormat={{ hour: "numeric" }}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        themeSystem="standard"
        expandRows={true}
        eventMinHeight={32}
        nowIndicator={true}
        scrollTime={new Date().toTimeString().slice(0, 5)}
      />
    </div>
  );
}
