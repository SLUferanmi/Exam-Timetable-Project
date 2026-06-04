import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Badge } from '../components/UI';
import api from '../api';
import { Download, AlertTriangle, Calendar, MapPin, Clock, Zap, RefreshCw, ArrowLeft, Users, Settings, ShieldAlert, ShieldCheck, BarChart2, History } from 'lucide-react';

// ── ConstraintViolationTooltip ────────────────────────────────────────────────
// Fixed-position popup for force-placed (red) cards. Escapes overflow containers.
const ConstraintViolationTooltip = ({ exam, hallName, courseText }) => {
    const [pos, setPos]   = useState(null);
    const cardRef         = useRef(null);
    const violations = exam?.constraint_violations || [];
    const met        = exam?.constraints_met   ?? 0;
    const total      = exam?.constraints_total ?? 0;
    const timeslot   = exam?.timeslot;
    const slotStr    = timeslot
        ? `${new Date(timeslot.date + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short'
          })} · ${timeslot.start_time?.substring(0,5)} – ${timeslot.end_time?.substring(0,5)}`
        : 'Unknown slot';
    const dept     = exam?.course?.department || '—';
    const students = exam?.student_allocation || exam?.course?.required_capacity || 0;

    const handleEnter = () => {
        if (!cardRef.current) return;
        const r = cardRef.current.getBoundingClientRect();
        const tooltipH = 280;
        const spaceBelow = window.innerHeight - r.bottom;
        const top = spaceBelow >= tooltipH ? r.bottom + 8 : r.top - tooltipH - 8;
        setPos({ top, left: Math.min(r.left, window.innerWidth - 336) });
    };

    return (
        <div ref={cardRef} onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>
            <div className="bg-red-50 border-l-4 border-l-red-500 border border-red-200 shadow-sm rounded-xl p-3 cursor-help hover:border-red-300 transition-colors">
                <div className="font-semibold text-red-900 text-sm mb-2 leading-tight">{courseText}</div>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        met === total ? 'bg-green-100 text-green-700' :
                        met === 0    ? 'bg-red-100 text-red-700'    : 'bg-orange-100 text-orange-700'
                    }`}><ShieldAlert size={11}/>{met}/{total} constraints met</span>
                    <span className="text-xs text-red-500 italic">Next-best slot</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-red-100">
                    <div className="flex items-center gap-1.5 text-red-800 font-bold bg-red-100 px-2 py-1 rounded-md">
                        <MapPin size={11}/><span>{hallName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-500">
                        <Users size={11}/><span>{students}</span>
                    </div>
                </div>
            </div>
            {pos && (
                <div className="fixed z-[9999] w-80 bg-stone-900 text-white rounded-xl shadow-2xl p-4 text-xs pointer-events-none"
                     style={{ top: pos.top, left: pos.left }}>
                    <div className="font-bold text-sm mb-1">{exam?.course?.code || '—'}</div>
                    <div className="text-stone-400 mb-2">{dept} · {students} students · {hallName}</div>
                    <div className="text-stone-300 mb-3">{slotStr}</div>
                    <div className="bg-stone-800 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                        <ShieldAlert size={13} className="text-orange-400 shrink-0"/>
                        <span className="font-semibold text-orange-300">{met} of {total} constraint{total !== 1 ? 's' : ''} satisfied</span>
                    </div>
                    <div className="text-stone-400 italic mb-2">No fully-valid slot existed — this is the next-best placement.</div>
                    {violations.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="text-red-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Violated Constraints:</div>
                            {violations.map((v, i) => (
                                <div key={i} className="bg-red-900/40 rounded-lg p-2">
                                    <div className="font-semibold text-red-300 mb-0.5">{v.label}</div>
                                    <div className="text-stone-300">{v.detail}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── HistoricalPlacementTooltip ─────────────────────────────────────────────────
// Fixed-position popup for historically-guided (amber) cards.
const HistoricalPlacementTooltip = ({ hallExams, hallName, courseText, hasSplit, totalStudents }) => {
    const [pos, setPos] = useState(null);
    const cardRef       = useRef(null);

    const handleEnter = () => {
        if (!cardRef.current) return;
        const r = cardRef.current.getBoundingClientRect();
        const tooltipH = 260;
        const spaceBelow = window.innerHeight - r.bottom;
        const top = spaceBelow >= tooltipH ? r.bottom + 8 : r.top - tooltipH - 8;
        setPos({ top, left: Math.min(r.left, window.innerWidth - 336) });
    };

    // Build per-course historical detail lines
    const guidedExams  = hallExams.filter(e => e.preference_guided);
    const timeslot     = hallExams[0]?.timeslot;
    const hour         = timeslot ? parseInt(String(timeslot.start_time).substring(0,2)) : null;
    const timeLabel    = hour === null ? '' : hour < 11 ? 'morning (08:15)' : hour < 14 ? 'midday (11:00)' : 'afternoon (14:00)';
    const slotStr      = timeslot
        ? `${new Date(timeslot.date + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short' })} · ${String(timeslot.start_time).substring(0,5)} – ${String(timeslot.end_time).substring(0,5)}`
        : 'Unknown slot';

    return (
        <div ref={cardRef} onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>
            <div className="bg-amber-50 border-l-4 border-l-amber-400 border border-amber-200 shadow-sm rounded-xl p-3 cursor-help hover:border-amber-300 transition-colors">
                <div className="font-semibold text-stone-900 mb-2 leading-tight text-sm">{courseText}</div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-amber-100">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold bg-amber-100 px-2 py-1 rounded-md">
                        <MapPin size={11}/><span>{hallName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-500">
                        <Zap size={11} className="text-amber-500"/>
                        <Users size={11}/><span>{totalStudents}</span>
                        {hasSplit && <span className="ml-1 text-amber-600 font-bold">↔</span>}
                    </div>
                </div>
            </div>
            {pos && (
                <div className="fixed z-[9999] w-80 bg-stone-900 text-white rounded-xl shadow-2xl p-4 text-xs pointer-events-none"
                     style={{ top: pos.top, left: pos.left }}>
                    <div className="flex items-center gap-2 mb-1">
                        <History size={12} className="text-amber-400 shrink-0"/>
                        <span className="font-bold text-sm text-amber-300">Historically Guided</span>
                    </div>
                    <div className="text-stone-400 mb-3">{slotStr}</div>
                    {guidedExams.map((e, i) => {
                        const code = e.course?.code || '—';
                        const dept = e.course?.department || '—';
                        const alloc = e.student_allocation || e.course?.required_capacity || 0;
                        return (
                            <div key={i} className="bg-stone-800 rounded-lg p-2.5 mb-2">
                                <div className="font-semibold text-amber-300 mb-1">{code}</div>
                                <div className="text-stone-400 mb-1">{dept} · {alloc} students</div>
                                <div className="text-stone-300 text-[10px] leading-relaxed">
                                    Historical records show <strong className="text-white">{code}</strong> was
                                    previously scheduled in <strong className="text-white">{hallName}</strong> during
                                    the <strong className="text-white">{timeLabel}</strong> session.
                                    The scheduler matched this pattern from uploaded PDF timetables.
                                </div>
                            </div>
                        );
                    })}
                    {hasSplit && (
                        <div className="text-stone-400 italic text-[10px] mt-1">
                            ↔ This course is split across multiple halls in this timeslot.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [unscheduledCourses, setUnscheduledCourses] = useState([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generatingSlots, setGeneratingSlots] = useState(false);

    const fetchData = async () => {
        try {
            const pRes = await api.get(`projects/${id}/`);
            setProject(pRes.data);

            // Set dates if they exist
            if (pRes.data.exam_start_date) setStartDate(pRes.data.exam_start_date);
            if (pRes.data.exam_end_date) setEndDate(pRes.data.exam_end_date);

            const sRes = await api.get(`schedules/?project=${id}`);
            setSchedule(sRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 403 || error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleGenerateTimeslots = async () => {
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        setGeneratingSlots(true);
        try {
            const response = await api.post(`projects/${id}/generate_timeslots/`, {
                start_date: startDate,
                end_date: endDate
            });

            alert(`Generated ${response.data.timeslots_created} timeslots for ${response.data.exam_days} exam days`);
            setShowDatePicker(false);
            await fetchData();
        } catch (error) {
            console.error('Error generating timeslots:', error);
            alert(error.response?.data?.error || 'Failed to generate timeslots');
        } finally {
            setGeneratingSlots(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setUnscheduledCourses([]);
        try {
            const res = await api.post(`projects/${id}/generate/`);
            await fetchData();
            if (res.data.unscheduled?.length > 0) {
                setUnscheduledCourses(res.data.unscheduled);
            }
        } catch (error) {
            console.error('Error generating schedule:', error);
            alert('Failed to generate schedule. Please check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="space-y-6">
                    <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-8 animate-pulse">
                        <div className="h-8 bg-stone-100 rounded w-1/3 mb-4" />
                        <div className="h-4 bg-stone-100 rounded w-1/4" />
                    </div>
                </div>
            </Layout>
        );
    }

    // Group schedule by date and time
    const groupedSchedule = {};
    schedule.forEach(item => {
        if (!item.timeslot || !item.timeslot.date) return;

        const date = item.timeslot.date;
        const time = `${item.timeslot.start_time?.substring(0, 5)} - ${item.timeslot.end_time?.substring(0, 5)}`;

        if (!groupedSchedule[date]) {
            groupedSchedule[date] = {};
        }
        if (!groupedSchedule[date][time]) {
            groupedSchedule[date][time] = [];
        }
        groupedSchedule[date][time].push(item);
    });

    const dates = Object.keys(groupedSchedule).sort();
    const timeSlots = ['08:15 - 10:15', '11:00 - 13:00', '14:00 - 17:00'];

    // Unique courses scheduled (a split course appears in multiple rows but is still one course)
    const uniqueCoursesScheduled = new Set(schedule.map(s => s.project_course)).size;
    const totalHallAssignments = schedule.length;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Unscheduled Courses Warning Banner */}
                {unscheduledCourses.length > 0 && (
                    <div className="bg-orange-50 border border-orange-300 rounded-xl px-6 py-4 flex items-start gap-4">
                        <AlertTriangle size={22} className="text-orange-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold text-orange-900 mb-1">
                                {unscheduledCourses.length} course{unscheduledCourses.length > 1 ? 's' : ''} could not be scheduled
                            </p>
                            <p className="text-sm text-orange-700 mb-2">
                                These courses were skipped because no valid hall + timeslot combination was found
                                (e.g. all valid slots had department conflicts, or no hall had sufficient capacity).
                                Try adding more halls, extending the exam period, or reducing course counts.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {unscheduledCourses.map(code => (
                                    <span key={code} className="bg-orange-100 text-orange-800 text-xs font-mono font-semibold px-2.5 py-1 rounded-md border border-orange-200">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 mb-2">{project?.name}</h1>
                            <div className="flex gap-4 text-sm text-stone-600">
                                <span>{project?.academic_session}</span>
                                <span>•</span>
                                <span>{project?.semester}</span>
                            </div>
                            {project?.exam_start_date && project?.exam_end_date && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-stone-600">
                                    <Calendar size={16} />
                                    <span>{project.exam_start_date} to {project.exam_end_date}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => navigate(`/project/${id}/setup`)}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <Settings size={18} />
                                Project Setup
                            </Button>

                            <Button
                                onClick={() => navigate(`/project/${id}/compare`)}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <BarChart2 size={18} />
                                Compare Algorithms
                            </Button>

                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white shadow-sm"
                            >
                                {generating ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        {schedule.length > 0 ? 'Regenerate' : 'Generate'} Timetable
                                    </>
                                )}
                            </Button>
                        </div>

                    </div>
                </div>

                {/* Date Picker Modal */}
                {showDatePicker && (
                    <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-6">
                        <h2 className="text-xl font-bold text-stone-900 mb-4">Exam Period Setup</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleGenerateTimeslots}
                                disabled={generatingSlots || !startDate || !endDate}
                                className="flex items-center gap-2"
                            >
                                {generatingSlots ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Calendar size={18} />
                                        Generate Timeslots
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={() => setShowDatePicker(false)}
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                        </div>
                        <p className="text-sm text-stone-600 mt-3">
                            This will create 3 time slots per day (8:15-10:15, 11am-1pm, 2pm-5pm) for Monday-Saturday only.
                        </p>
                    </div>
                )}

                {/* Timetable */}
                {schedule.length === 0 ? (
                    <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-12 text-center">
                        <AlertTriangle className="mx-auto mb-4 text-amber-600" size={48} />
                        <h3 className="text-xl font-semibold text-stone-900 mb-2">No Schedule Generated</h3>
                        <p className="text-stone-600 mb-6">
                            Set up your exam dates and click "Generate Timetable" to create a schedule
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-6 overflow-x-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-stone-900">Examination Timetable</h2>
                            <div className="flex items-center gap-3">
                                <Badge variant="success" className="text-sm">
                                    {uniqueCoursesScheduled} courses scheduled
                                </Badge>
                                {totalHallAssignments !== uniqueCoursesScheduled && (
                                    <Badge variant="default" className="text-xs text-stone-500">
                                        {totalHallAssignments - uniqueCoursesScheduled} split across halls
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-stone-300">
                                    <th className="text-left p-4 font-semibold text-stone-700 bg-stone-50">Date</th>
                                    {timeSlots.map(slot => (
                                        <th key={slot} className="text-left p-4 font-semibold text-stone-700 bg-stone-50">
                                            {slot}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dates.map(date => (
                                    <tr key={date} className="border-b border-stone-200 hover:bg-stone-50 transition-colors">
                                        <td className="p-4 font-medium text-stone-900">
                                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        {timeSlots.map(slot => {
                                            const exams = groupedSchedule[date]?.[slot] || [];

                                            // Identify split courses in this timeslot
                                            const courseSegments = {};
                                            exams.forEach(exam => {
                                                const code = exam.course?.code;
                                                if (code) {
                                                    if (!courseSegments[code]) courseSegments[code] = [];
                                                    courseSegments[code].push(exam);
                                                }
                                            });
                                            // Sort segments deterministically (by student allocation descending) to assign stable Part numbers
                                            Object.values(courseSegments).forEach(segs => segs.sort((a, b) => (b.student_allocation || 0) - (a.student_allocation || 0)));

                                            // Group exams by hall
                                            const examsByHall = {};
                                            exams.forEach(exam => {
                                                const hallName = exam.hall?.name || 'TBA';
                                                if (!examsByHall[hallName]) examsByHall[hallName] = [];
                                                examsByHall[hallName].push(exam);
                                            });

                                            return (
                                                <td key={slot} className="p-4 align-top w-1/4">
                                                    {Object.keys(examsByHall).length > 0 ? (
                                                        <div className="space-y-3">
                                                            {Object.entries(examsByHall).map(([hallName, hallExams], idx) => {
                                                                const totalStudents = hallExams.reduce((sum, e) =>
                                                                    sum + (e.student_allocation || e.course?.required_capacity || 0), 0);

                                                                const courseText = hallExams.map(e => {
                                                                    const code = e.course?.code || 'TBA';
                                                                    const inHall = e.student_allocation || e.course?.required_capacity || 0;

                                                                    let splitText = '';
                                                                    if (code !== 'TBA' && courseSegments[code]?.length > 1) {
                                                                        const partIndex = courseSegments[code].findIndex(seg => seg.id === e.id) + 1;
                                                                        const totalParts = courseSegments[code].length;
                                                                        splitText = ` [Part ${partIndex} of ${totalParts}]`;
                                                                    }

                                                                    return `${code}${splitText} (${inHall})`;
                                                                }).join(', ');

                                                                const hasViolations = hallExams.some(e => e.has_violations);
                                                                const isAIGuided    = hallExams.some(e => e.preference_guided);
                                                                const hasSplit      = hallExams.some(e => e.course?.code && courseSegments[e.course.code]?.length > 1);


                                                                if (hasViolations) {
                                                                    const primaryExam = hallExams.find(e => e.has_violations) || hallExams[0];
                                                                    return (
                                                                        <ConstraintViolationTooltip
                                                                            key={idx}
                                                                            exam={primaryExam}
                                                                            hallName={hallName}
                                                                            courseText={courseText}
                                                                        />
                                                                    );
                                                                }

                                                                if (isAIGuided) {
                                                                    return (
                                                                        <HistoricalPlacementTooltip
                                                                            key={idx}
                                                                            hallExams={hallExams}
                                                                            hallName={hallName}
                                                                            courseText={courseText}
                                                                            hasSplit={hasSplit}
                                                                            totalStudents={totalStudents}
                                                                        />
                                                                    );
                                                                }

                                                                return (
                                                                    <div key={idx} className="bg-white border border-stone-200 shadow-sm rounded-xl p-3 hover:border-amber-300 transition-colors">
                                                                        <div className="font-semibold text-stone-900 mb-2 leading-tight text-sm">{courseText}</div>
                                                                        <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-100">
                                                                            <div className="flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md">
                                                                                <MapPin size={11}/><span>{hallName}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-stone-500">
                                                                                <Users size={11}/><span>{totalStudents}</span>
                                                                                {hasSplit && <span className="ml-1 text-amber-600 font-bold">↔</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <span className="text-stone-300 text-sm font-medium">-</span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ProjectDetail;
