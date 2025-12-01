'use client';

import { Calendar } from '@/components/ui/calendar';
import dayjs from 'dayjs';
import { CalendarDay, Modifiers, UI } from 'react-day-picker';
import { HTMLAttributes, JSX, TableHTMLAttributes, ThHTMLAttributes, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Capsule } from '@/types/capsule';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';

const CustomWeekday: (props: ThHTMLAttributes<HTMLTableCellElement>) => JSX.Element = (
  { children, 'aria-label': ariaLabel, className, ...props }
) => {
  return <th className={cn(
    className,
    "py-2 font-bold text-sm text-black"
  )} {...props}>
    {ariaLabel?.slice(0,1).toUpperCase()}
  </th>
}

const CustomDayCell: (props: ({
  day: CalendarDay
  modifiers: Modifiers
} & HTMLAttributes<HTMLDivElement>)) => JSX.Element = (
  { day, modifiers, className, ...props }
) => {
  const isLocked = modifiers?.caps && dayjs().isBefore(day.date);
  const isUnlocked = modifiers?.caps && dayjs().isAfter(day.date);

  return <td className={cn(
    className,
    'flex justify-center items-center',
    modifiers?.caps && 'bg-white/80 rounded-md',
    isLocked && 'text-pink-dark font-bold cursor-pointer',
    (modifiers?.today || isUnlocked) && 'bg-pink-dark text-white font-bold cursor-pointer',
  )} {...props}>
    {modifiers?.caps ? <Link href={`/capsules/date/${dayjs(day.date).format('YYYY-MM-DD')}`} className="w-full h-full text-center flex justify-center items-center">
      {dayjs(day.date).format('D')}
    </Link> : dayjs(day.date).format('D')}
  </td>;
}

const CustomMonthGrid: (props: TableHTMLAttributes<HTMLTableElement>) => JSX.Element = ({
  className, ...props
}) => {
  return <div
    className={cn(
      className,
    )}
  >
    <table className={cn(
      'border-collapse w-full'
    )} {...props} />
  </div>;
}

export function CalendarPage({
  data,
}: {
  data: Capsule[];
}) {
  // Find the earliest capsule date
  const earliestCapsuleDate = useMemo(() => {
    if (data.length === 0) return null;
    const firstCapsule = data[0];
    if (!firstCapsule) return null;
    return data.reduce((earliest, capsule) => {
      const capsuleDate = dayjs(capsule.createdAt);
      return capsuleDate.isBefore(earliest) ? capsuleDate : earliest;
    }, dayjs(firstCapsule.createdAt));
  }, [data]);

  const [showAll, setShowAll] = useState(false);

  const months = useMemo(() => {
    if (showAll && earliestCapsuleDate) {
      // Generate months from earliest capsule to 12 months from now
      const monthsArray: Date[] = [];
      let current = earliestCapsuleDate.startOf('month');
      const end = dayjs().add(12, 'month').startOf('month');
      
      while (current.isBefore(end) || current.isSame(end, 'month')) {
        monthsArray.push(current.toDate());
        current = current.add(1, 'month');
      }
      return monthsArray;
    }
    
    // Default: next 12 months
    return new Array(12).fill(0).map((_, i) => {
      return dayjs().add(i, 'month').toDate();
    });
  }, [showAll, earliestCapsuleDate]);

  const canShowMore = earliestCapsuleDate && earliestCapsuleDate.isBefore(dayjs().startOf('month'));

  return <div className="flex flex-col gap-4 px-5">
    {canShowMore && !showAll && (
      <Button 
        variant="outline" 
        onClick={() => setShowAll(true)}
        className="self-center bg-pink-light hover:bg-pink-dark hover:text-white border-pink-dark text-pink-dark"
      >
        <ChevronUp className="w-4 h-4 mr-2" />
        Voir plus
      </Button>
    )}
    
    {months.map((month, idx) => {
      const monthDate = dayjs(month).format('YYYY-MM');

      const filteredCaps = data.reduce((acc, cur) => {
        const capsuleDate = dayjs(cur.openingDate);

        if (monthDate === capsuleDate.format('YYYY-MM')) {
          return [...acc, capsuleDate.toDate()];
        }

        return acc;
      }, [] as Date[])

      return <Calendar
        key={idx}
        showOutsideDays={false}
        month={month}
        numberOfMonths={1}
        hideNavigation={true}
        className="w-full bg-transparent p-0"
        modifiers={{
          caps: filteredCaps,
        }}
        classNames={{
          // [UI.Root]: 'border-2 border-pink-dark rounded-lg p-2 bg-transparent',
          // [UI.Chevron]: 'border-2 border-red-500 rounded-lg p-2 bg-transparent',
          // [UI.Day]: 'border-2 border-green-500 rounded-lg p-2 bg-transparent', //
          // [UI.DayButton]: 'border-2 border-blue-500 rounded-lg p-2 bg-transparent',
          // [UI.CaptionLabel]: 'border-2 border-yellow-500 rounded-lg p-2 bg-transparent', //
          // [UI.Dropdowns]: 'border-2 border-purple-500 rounded-lg p-2 bg-transparent',
          // [UI.Dropdown]: 'border-2 border-orange-500 rounded-lg p-2 bg-transparent',
          // [UI.DropdownRoot]: 'border-2 border-teal-500 rounded-lg p-2 bg-transparent',
          // [UI.Footer]: 'border-2 border-gray-500 rounded-lg p-2 bg-transparent',
          [UI.MonthGrid]: 'bg-pink-light rounded-2xl shadow-lg p-2', //
          [UI.MonthCaption]: 'text-center uppercase', //
          // [UI.MonthsDropdown]: 'border-2 border-cyan-500 rounded-lg p-2 bg-transparent',
          // [UI.Month]: 'border-2 border-amber-500 rounded-lg p-2 bg-transparent', //
          // [UI.Months]: 'border-2 border-fuchsia-500 rounded-lg p-2 bg-transparent', //
          // [UI.Nav]: 'border-2 border-rose-500 rounded-lg p-2 bg-transparent',
          // [UI.NextMonthButton]: 'border-2 border-green-300 rounded-lg p-2 bg-transparent',
          // [UI.PreviousMonthButton]: 'border-2 border-blue-300 rounded-lg p-2 bg-transparent',
          // [UI.Week]: 'border-2 border-yellow-300 rounded-lg p-2 bg-transparent', //
          // [UI.Weeks]: 'border-2 border-purple-300 rounded-lg p-2 bg-transparent', //
          // [UI.Weekday]: 'border-2 border-orange-300 rounded-lg p-2 bg-transparent', //
          // [UI.Weekdays]: 'border-2 border-teal-300 rounded-lg p-2 bg-transparent', //
          // [UI.WeekNumber]: 'border-2 border-gray-300 rounded-lg p-2 bg-transparent',
          // [UI.WeekNumberHeader]: 'border-2 border-pink-300 rounded-lg p-2 bg-transparent',
          // [UI.YearsDropdown]: 'border-2 border-lime-300 rounded-lg p-2 bg-transparent',
        }}
        components={{
          Day: CustomDayCell,
          Weekday: CustomWeekday,
          MonthGrid: CustomMonthGrid,
        }}
      />;
    })}
  </div>;
}