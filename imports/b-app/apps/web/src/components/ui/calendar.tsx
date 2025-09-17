"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { cn } from "./utils";
import { buttonVariants } from "./button";

interface CalendarProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

function Calendar({ value, onChange }: CalendarProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        value={value}
        onChange={onChange}
        slotProps={{ textField: { variant: 'outlined' } }}
      />
    </LocalizationProvider>
  );
}

export { Calendar };
