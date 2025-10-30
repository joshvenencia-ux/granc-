import { useEffect, useMemo, useState } from 'react';

type Props = {
    value: string; 
    onChange: (val: string) => void;
    minYear?: number;
    maxYear?: number;
};

export default function FechaSelect({ value, onChange, minYear = 1940, maxYear }: Props) {
    const today = new Date();
    const maxY = maxYear ?? today.getFullYear();

    const [y, setY] = useState('');
    const [m, setM] = useState('');
    const [d, setD] = useState('');

    useEffect(() => {
        if (!value) {
            setY('');
            setM('');
            setD('');
            return;
        }
        const [yy, mm, dd] = value.split('-');
        if (yy && mm && dd) {
            setY(yy);
            setM(mm);
            setD(dd);
        }
    }, [value]);

    const years = useMemo(() => {
        const arr: number[] = [];
        for (let yy = maxY; yy >= minYear; yy--) arr.push(yy);
        return arr;
    }, [maxY, minYear]);

    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    const daysInMonth = useMemo(() => {
        if (!y || !m) return 31;
        const nY = Number(y);
        const nM = Number(m);
        return new Date(nY, nM, 0).getDate();
    }, [y, m]);

    const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

    const maybeEmit = (yy: string, mm: string, dd: string) => {
        if (yy && mm && dd) onChange(`${yy}-${mm}-${dd}`);
    };

    const onYear = (val: string) => {
        setY(val);
        const maxD = new Date(Number(val || y || 2000), Number(m || 1), 0).getDate();
        const nextD = d && Number(d) <= maxD ? d : '';
        if (nextD !== d) setD(nextD);
        maybeEmit(val, m, nextD);
    };

    const onMonth = (val: string) => {
        setM(val);
        const maxD = new Date(Number(y || 2000), Number(val || 1), 0).getDate();
        const nextD = d && Number(d) <= maxD ? d : '';
        if (nextD !== d) setD(nextD);
        maybeEmit(y, val, nextD);
    };

    const onDay = (val: string) => {
        setD(val);
        maybeEmit(y, m, val);
    };

    return (
        <div className="d-flex gap-2">
            <select className="form-select" value={y} onChange={(e) => onYear(e.target.value)}>
                <option value="">Año</option>
                {years.map((yy) => (
                    <option key={yy} value={String(yy)}>{yy}</option>
                ))}
            </select>

            <select className="form-select" value={m} onChange={(e) => onMonth(e.target.value)}>
                <option value="">Mes</option>
                {months.map((mm) => (
                    <option key={mm} value={mm}>{mm}</option>
                ))}
            </select>

            <select className="form-select" value={d} onChange={(e) => onDay(e.target.value)}>
                <option value="">Día</option>
                {days.map((dd) => (
                    <option key={dd} value={dd}>{dd}</option>
                ))}
            </select>
        </div>
    );
}
