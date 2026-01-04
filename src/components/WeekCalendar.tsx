import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Training {
  id: string;
  datetime: string;
  name: string;
}

interface WeekCalendarProps {
  trainings: Training[];
  onSelectDate?: (date: Date) => void;
}

const WeekCalendar = ({ trainings, onSelectDate }: WeekCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  useEffect(() => {
    const today = new Date();
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }
    setWeekDays(days);
  }, []);

  const getDayName = (date: Date) => {
    return format(date, "EEEE", { locale: ptBR }).toUpperCase();
  };

  const hasTrainingOnDay = (date: Date) => {
    return trainings.some(training => 
      isSameDay(new Date(training.datetime), date)
    );
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="w-full py-12 px-4">
      <div className="container mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-destructive/50 text-destructive text-sm">
            <Calendar className="w-4 h-4" />
            Calendário de Eventos
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-black text-center mb-2 tracking-tight">
          FIQUE DE OLHO!
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Em breve teremos novas scrims. Acompanhe o calendário.
        </p>

        {/* Week Days */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <Calendar className="w-4 h-4" />
            PRÓXIMOS 7 DIAS
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasTraining = hasTrainingOnDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={index}
                onClick={() => handleSelectDate(day)}
                className={`
                  relative flex flex-col items-center justify-center p-3 md:p-4 rounded-lg transition-all
                  ${isSelected 
                    ? "bg-destructive/20 border-2 border-destructive text-destructive" 
                    : "bg-card/50 border border-border hover:border-destructive/50"
                  }
                `}
              >
                <span className="text-[10px] md:text-xs text-muted-foreground mb-1">
                  {getDayName(day).slice(0, 3)}
                </span>
                <span className={`text-xl md:text-3xl font-bold ${isSelected ? "text-destructive" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {hasTraining && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekCalendar;