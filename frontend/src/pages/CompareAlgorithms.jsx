import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { ArrowLeft, Play, MapPin, Users, ShieldAlert, AlertTriangle } from 'lucide-react';

const ALGO_KEYS = ['basic_greedy', 'traditional', 'improved'];

const ALGO_META = {
    basic_greedy: {
        label:        'Basic Greedy',
        description:  'First-Fit Decreasing (FFD). Courses sorted largest → smallest. Walks timeslots in strict chronological order and takes the first valid (hall, slot) pair. No load-balancing, no sharing, no splitting. Courses that cannot be placed are dropped.',
        accentBg:     'bg-sky-50',
        accentBorder: 'border-sky-200',
        accentText:   'text-sky-900',
        accentBadge:  'bg-sky-100 text-sky-800',
        barColor:     '#38bdf8',
    },
    traditional: {
        label:        'Traditional (Historical)',
        description:  'Strict historical replay from uploaded PDF timetables. Each course is placed in the exact hall and time-of-day (morning / midday / afternoon) it appeared in past timetables. No fallback — if no matching slot is open the course is dropped.',
        accentBg:     'bg-violet-50',
        accentBorder: 'border-violet-200',
        accentText:   'text-violet-900',
        accentBadge:  'bg-violet-100 text-violet-800',
        barColor:     '#a78bfa',
    },
    improved: {
        label:        'Improved',
        description:  'Production engine: venue sharing, student splitting, historical preference scoring (learned from PDF data), and force-placement. Shows the real output of Generate Timetable — reads existing schedule records, not re-run.',
        accentBg:     'bg-amber-50',
        accentBorder: 'border-amber-200',
        accentText:   'text-amber-900',
        accentBadge:  'bg-amber-100 text-amber-800',
        barColor:     '#f59e0b',
    },
};

const TIME_SLOTS = ['08:15 - 10:15', '11:00 - 13:00', '14:00 - 17:00'];

// ── Exam card ─────────────────────────────────────────────────────────────────
const ExamCard = ({ entry }) => {
    const [hover, setHover] = useState(false);
    const isForced = entry.is_forced && entry.violations?.length > 0;
    const isGuided = entry.preference_guided && !isForced;

    let border = 'border-l-stone-200 bg-white';
    if (isForced) border = 'border-l-red-500 bg-red-50';
    else if (isGuided) border = 'border-l-amber-400 bg-amber-50';

    return (
        <div
            className={`border border-stone-200 border-l-4 ${border} rounded p-2 text-xs relative`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="font-semibold text-stone-900 truncate">
                {entry.course_code}
                {entry.is_split && <span className="ml-1 text-[10px] text-stone-400 font-normal">split</span>}
            </div>
            {isForced && (
                <div className="text-[10px] text-red-600 font-medium mt-0.5">
                    {entry.constraints_met}/{entry.constraints_total} constraints
                </div>
            )}
            <div className="flex justify-between mt-1 text-stone-400">
                <span className="truncate flex items-center gap-0.5"><MapPin size={8} />{entry.hall_name}</span>
                <span className="flex items-center gap-0.5 shrink-0 ml-1"><Users size={8} />{entry.students}</span>
            </div>

            {hover && isForced && (
                <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-stone-900 text-white rounded-lg shadow-xl p-3 text-xs pointer-events-none" style={{zIndex:9999}}>
                    <div className="font-semibold mb-1">{entry.course_code} — force-placed</div>
                    <div className="text-stone-400 mb-2 text-[10px]">{entry.constraints_met}/{entry.constraints_total} constraints satisfied</div>
                    {entry.violations?.map((v, i) => (
                        <div key={i} className="bg-stone-800 rounded p-1.5 mb-1">
                            <div className="text-stone-300 text-[10px]">{v.detail}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Timetable grid ────────────────────────────────────────────────────────────
const TimetableGrid = ({ schedule }) => {
    const grouped = {};
    schedule.forEach(e => {
        const time = `${e.slot_start} - ${e.slot_end}`;
        if (!grouped[e.slot_date]) grouped[e.slot_date] = {};
        if (!grouped[e.slot_date][time]) grouped[e.slot_date][time] = [];
        grouped[e.slot_date][time].push(e);
    });
    const dates = Object.keys(grouped).sort();

    if (!dates.length) return (
        <p className="text-stone-400 text-sm p-6">No assignments generated.</p>
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr>
                        <th className="text-left px-3 py-2 font-semibold text-stone-500 bg-stone-50 border-b border-r border-stone-200 w-24">Date</th>
                        {TIME_SLOTS.map(s => (
                            <th key={s} className="text-left px-3 py-2 font-semibold text-stone-500 bg-stone-50 border-b border-stone-200">{s}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dates.map((date, di) => (
                        <tr key={date} className={di % 2 === 0 ? '' : 'bg-stone-50/50'}>
                            <td className="px-3 py-2 font-medium text-stone-600 align-top border-r border-b border-stone-100 whitespace-nowrap">
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
                                    weekday: 'short', day: 'numeric', month: 'short'
                                })}
                            </td>
                            {TIME_SLOTS.map(slot => {
                                const entries = grouped[date]?.[slot] || [];
                                return (
                                    <td key={slot} className="p-1.5 align-top border-b border-stone-100 min-w-[160px]">
                                        {entries.length > 0
                                            ? <div className="space-y-1">{entries.map((e, i) => <ExamCard key={i} entry={e} />)}</div>
                                            : <span className="text-stone-300 pl-1">—</span>
                                        }
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Inline bar chart ──────────────────────────────────────────────────────────
const Bar = ({ value, max, color }) => (
    <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((value / (max || 1)) * 100, value > 0 ? 4 : 0)}%`, backgroundColor: color, transition: 'width 0.5s ease' }}
            />
        </div>
    </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const CompareAlgorithms = () => {
    const navigate    = useNavigate();
    const { id }      = useParams();
    const [results,   setResults]   = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [activeTab, setActiveTab] = useState('basic_greedy');
    const [error,     setError]     = useState(null);

    const run = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('compare-algorithms/', { project_id: id });
            setResults(res.data);
            setActiveTab('basic_greedy');
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to run. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    const info         = results?.project_info;
    const totalCourses = info?.courses ?? 0;

    const METRICS = [
        { label: 'Execution time (ms)',  key: 'time_ms',             unit: 'ms',      best: 'min', fmt: v => v === null ? 'N/A' : `${v.toFixed(2)} ms` },
        { label: 'Courses scheduled',   key: 'scheduled',           unit: '',        best: 'max', fmt: v => v },
        { label: 'Courses dropped',     key: 'dropped',             unit: '',        best: 'min', fmt: v => v },
        { label: 'Force-placed',        key: 'forced',              unit: '',        best: 'min', fmt: v => v },
        { label: 'Hall utilisation',    key: 'utilization_pct',     unit: '%',       best: 'max', fmt: v => `${v}%` },
        { label: 'Historically guided', key: 'historically_guided', unit: '',        best: 'max', fmt: v => v },
        { label: 'Dept. conflicts',     key: 'dept_conflicts',      unit: '',        best: 'min', fmt: v => v },
        { label: 'Capacity violations', key: 'capacity_violations', unit: '',        best: 'min', fmt: v => v },
    ];

    return (
        <Layout>
            <div className="space-y-5 max-w-[1400px] mx-auto">

                {/* ── Header */}
                <div>
                    <button
                        onClick={() => navigate(`/project/${id}`)}
                        className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-sm mb-3 transition-colors"
                    >
                        <ArrowLeft size={15} /> Back to Project
                    </button>
                    <div className="flex justify-between items-end flex-wrap gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-stone-900">Algorithm Comparison</h1>
                            {info && (
                                <p className="text-stone-500 text-sm mt-0.5">
                                    {info.name} · {info.courses} courses · {info.halls} halls · {info.days} exam days
                                    {info.hist_coverage > 0 && ` · ${info.hist_coverage} courses have historical data`}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={run}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
                        >
                            <Play size={14} className={loading ? 'animate-pulse' : ''} />
                            {loading ? 'Running…' : results ? 'Re-run' : 'Run Comparison'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                {!results && !loading && (
                    <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-400">
                        <p className="text-sm">Click <strong className="text-stone-600">Run Comparison</strong> to benchmark all three algorithms on your project's courses, halls, and timeslots.</p>
                        <p className="text-xs mt-2 text-stone-400">The Improved tab reads your project's existing generated timetable — run Generate Timetable first if you haven't yet.</p>
                    </div>
                )}

                {results && (
                    <>
                        {/* ── Metrics table */}
                        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-stone-200">
                                <h2 className="text-sm font-semibold text-stone-700">Performance Metrics</h2>
                                <p className="text-xs text-stone-400 mt-0.5">Identical inputs — {totalCourses} courses, same halls, same timeslots.</p>
                            </div>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50">
                                        <th className="text-left px-5 py-2.5 font-medium text-stone-500 text-xs w-44">Metric</th>
                                        {ALGO_KEYS.map(k => (
                                            <th key={k} className="px-5 py-2.5 text-center">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded ${ALGO_META[k].accentBadge}`}>
                                                    {ALGO_META[k].label}
                                                </span>
                                            </th>
                                        ))}
                                        <th className="px-4 py-2.5 w-56 text-left">
                                            <span className="text-xs font-medium text-stone-400">Visual</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {METRICS.map(({ label, key, best, fmt }) => {
                                        const vals        = ALGO_KEYS.map(k => results[k]?.metrics?.[key] ?? null);
                                        const numericVals = vals.filter(v => v !== null);
                                        const maxVal      = Math.max(...numericVals.map(v => Math.abs(v)), 1);
                                        const winner      = numericVals.length
                                            ? (best === 'max' ? Math.max(...numericVals) : Math.min(...numericVals))
                                            : null;
                                        return (
                                            <tr key={key} className="border-b border-stone-100 hover:bg-stone-50/60">
                                                <td className="px-5 py-3 text-xs font-medium text-stone-600">{label}</td>
                                                {ALGO_KEYS.map((k, i) => {
                                                    const v        = vals[i];
                                                    const isWinner = v !== null && winner !== null && v === winner;
                                                    return (
                                                        <td key={k} className="px-5 py-3 text-center">
                                                            <span className={`text-sm font-semibold tabular-nums ${isWinner ? 'text-stone-900' : 'text-stone-400'}`}>
                                                                {fmt(v)}
                                                            </span>
                                                            {isWinner && (
                                                                <span className="ml-1.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">best</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1.5">
                                                        {ALGO_KEYS.map((k, i) => (
                                                            <div key={k} className="flex items-center gap-2">
                                                                <span className="text-[10px] text-stone-400 w-14 shrink-0 truncate">{ALGO_META[k].label.split(' ')[0]}</span>
                                                                <Bar value={vals[i] ?? 0} max={maxVal} color={ALGO_META[k].barColor} />
                                                                <span className="text-[10px] text-stone-500 w-10 text-right tabular-nums shrink-0">{fmt(vals[i])}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Completion rate footer */}
                            <div className="px-5 py-3 border-t border-stone-100 flex flex-wrap gap-6">
                                {ALGO_KEYS.map(k => {
                                    const m   = results[k]?.metrics;
                                    const pct = totalCourses > 0 ? Math.round(((m?.scheduled ?? 0) / totalCourses) * 100) : 0;
                                    return (
                                        <div key={k} className="flex items-center gap-3">
                                            <div className="w-20 text-xs text-stone-500 font-medium">{ALGO_META[k].label}</div>
                                            <div className="w-32 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ALGO_META[k].barColor }} />
                                            </div>
                                            <div className="text-xs font-semibold text-stone-700 tabular-nums">{pct}% scheduled</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Description cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {ALGO_KEYS.map(k => {
                                const m = results[k]?.metrics;
                                const a = ALGO_META[k];
                                return (
                                    <div key={k} className={`rounded-xl border p-4 ${a.accentBg} ${a.accentBorder}`}>
                                        <div className={`text-sm font-semibold mb-2 ${a.accentText}`}>{a.label}</div>
                                        <p className="text-xs text-stone-600 leading-relaxed">{a.description}</p>
                                        <div className={`mt-3 pt-3 border-t ${a.accentBorder} grid grid-cols-2 gap-x-4 gap-y-1 text-xs`}>
                                            <div className="text-stone-500">Scheduled</div>
                                            <div className="font-semibold text-stone-800 text-right">{m?.scheduled ?? '—'}/{totalCourses}</div>
                                            <div className="text-stone-500">Speed</div>
                                            <div className="font-semibold text-stone-800 text-right tabular-nums">
                                                {m?.time_ms === null || m?.time_ms === undefined ? 'N/A' : `${m.time_ms.toFixed(2)} ms`}
                                            </div>
                                            {k === 'traditional' && (
                                                <>
                                                    <div className="text-stone-500">Hist. matches</div>
                                                    <div className="font-semibold text-stone-800 text-right">{m?.historically_guided ?? 0}</div>
                                                </>
                                            )}
                                            {k === 'improved' && (m?.forced ?? 0) > 0 && (
                                                <>
                                                    <div className="text-stone-500">Force-placed</div>
                                                    <div className="font-semibold text-red-600 text-right">{m.forced}</div>
                                                </>
                                            )}
                                            {k === 'basic_greedy' && (m?.dropped ?? 0) > 0 && (
                                                <>
                                                    <div className="text-stone-500">Dropped</div>
                                                    <div className="font-semibold text-red-600 text-right">{m.dropped}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Timetable tabs */}
                        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                            <div className="flex border-b border-stone-200 bg-stone-50">
                                {ALGO_KEYS.map(k => {
                                    const m        = results[k]?.metrics;
                                    const isActive = activeTab === k;
                                    return (
                                        <button
                                            key={k}
                                            onClick={() => setActiveTab(k)}
                                            className={`flex-1 px-4 py-3 text-left text-sm transition-colors border-b-2 ${
                                                isActive
                                                    ? 'border-stone-900 bg-white text-stone-900'
                                                    : 'border-transparent text-stone-500 hover:text-stone-700'
                                            }`}
                                        >
                                            <div className="font-semibold">{ALGO_META[k].label}</div>
                                            {m && (
                                                <div className="text-xs text-stone-400 mt-0.5 font-normal">
                                                    {m.scheduled} scheduled
                                                    {m.dropped > 0 && ` · ${m.dropped} dropped`}
                                                    {m.forced  > 0 && ` · ${m.forced} forced`}
                                                </div>
                                            )}
                                            {k === 'improved' && results.improved?.no_schedule && (
                                                <div className="text-xs text-stone-400 mt-0.5">No timetable generated</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex gap-5 px-5 py-2 border-b border-stone-100 text-[11px] text-stone-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-3 h-3 border-l-2 border-l-stone-300 bg-white border border-stone-200 rounded-sm" /> Normal
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-3 h-3 border-l-2 border-l-amber-400 bg-amber-50 border border-amber-100 rounded-sm" /> Historically guided
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block w-3 h-3 border-l-2 border-l-red-500 bg-red-50 border border-red-100 rounded-sm" /> Force-placed (hover)
                                </span>
                            </div>

                            <div className="p-4">
                                {activeTab === 'improved' && results.improved?.no_schedule ? (
                                    <div className="py-10 text-center">
                                        <p className="text-sm font-medium text-stone-600 mb-1">No timetable generated yet</p>
                                        <p className="text-xs text-stone-400">
                                            The Improved tab shows the real output of your project's scheduling algorithm.<br />
                                            Go back to your project and click <strong>Generate Timetable</strong> first, then re-run the comparison.
                                        </p>
                                    </div>
                                ) : (
                                    <TimetableGrid schedule={results[activeTab]?.schedule || []} />
                                )}
                            </div>

                            {/* Dropped courses */}
                            {(results[activeTab]?.metrics?.dropped_codes?.length ?? 0) > 0 && (
                                <div className="mx-4 mb-4 border border-orange-200 rounded-lg px-4 py-3 bg-orange-50">
                                    <div className="flex items-center gap-2 text-sm font-medium text-orange-900 mb-2">
                                        <AlertTriangle size={13} />
                                        {results[activeTab].metrics.dropped_codes.length} course(s) dropped — no valid slot found
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {results[activeTab].metrics.dropped_codes.map(code => (
                                            <span key={code} className="text-[11px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Historical coverage note */}
                        {info?.hist_coverage === 0 && (
                            <div className="text-xs text-stone-400 text-center pb-2">
                                No historical PDF data found for this project's courses. Upload historical timetable PDFs to enable Traditional algorithm replay.
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default CompareAlgorithms;
