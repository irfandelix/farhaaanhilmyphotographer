'use client';

import { useState, useEffect } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CustomDatePicker({
  name,
  value,
  onChange,
  required = false,
  placeholder = 'Pilih tanggal...',
  className = 'input-field',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);

  const parseDateValue = (val) => {
    if (!val || typeof val !== 'string') return null;
    const parts = val.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return { year: y, month: m, day: d };
  };

  const parsed = parseDateValue(value);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : now.getMonth());

  useEffect(() => {
    const p = parseDateValue(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  const handleOpen = () => {
    const p = parseDateValue(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    } else {
      const today = new Date();
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setIsOpen(true);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const yyyy = String(viewYear);
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    if (onChange) {
      onChange({ target: { name, value: formatted } });
    }
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { name, value: '' } });
    }
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const displayValue = parsed
    ? `${parsed.day} ${MONTH_NAMES_ID[parsed.month]} ${parsed.year}`
    : '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input for native HTML form required validation */}
      <input
        type="text"
        name={name}
        value={value || ''}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        style={{
          position: 'absolute',
          opacity: 0,
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Trigger Field */}
      <div
        onClick={handleOpen}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: '#fff',
          color: displayValue ? '#111827' : '#9ca3af',
          ...style
        }}
      >
        <span>{displayValue || placeholder}</span>
        <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '8px' }}>📅</span>
      </div>

      {/* Calendar Modal Popup */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '24px',
              padding: '20px',
              width: '100%',
              maxWidth: '340px',
              boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2), 0 8px 15px -6px rgba(0, 0, 0, 0.1)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Header Month & Year + Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#111827' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={prevMonth}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007aff',
                    fontSize: '1.4rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1
                  }}
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007aff',
                    fontSize: '1.4rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1
                  }}
                >
                  &#8250;
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
              {DAY_NAMES.map((dayName) => (
                <div key={dayName} style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', padding: '4px 0' }}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '6px', textAlign: 'center', marginBottom: '20px' }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ height: '40px' }} />;
                }

                // Only highlight in blue if value is actually set and matches this exact date!
                const isSelected =
                  parsed &&
                  parsed.year === viewYear &&
                  parsed.month === viewMonth &&
                  parsed.day === day;

                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '40px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: isSelected ? '#007aff' : 'transparent',
                        color: isSelected ? '#ffffff' : '#111827',
                        fontSize: '1.05rem',
                        fontWeight: isSelected ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s, color 0.15s'
                      }}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer: Reset & Confirm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: '24px',
                  padding: '10px 22px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#007aff',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)'
                }}
              >
                &#10003;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
