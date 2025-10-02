import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Task, TaskStatus } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClockIcon from './icons/ClockIcon';
import { useTheme } from '../contexts/ThemeContext';
import { getTasksForDay } from '../utils/taskUtils';
import XIcon from './icons/XIcon';

interface MonthlyViewProps {
  tasks: Task[];
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { theme } = useTheme();

  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const getTasksForDayByNumber = (day: number) => {
    const date = new Date(year, month, day);
    return getTasksForDay(date, tasks);
  };

  const tasksForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    const date = new Date(year, month, selectedDay);
    return getTasksForDay(date, tasks);
  }, [selectedDay, year, month, tasks]);
  
  const monthTasks = tasks.filter(task => new Date(task.startTime).getMonth() === month && new Date(task.startTime).getFullYear() === year);
  
  const stats = {
    done: monthTasks.filter(t => t.status === TaskStatus.Done).length,
    pending: monthTasks.filter(t => t.status !== TaskStatus.Done).length,
    total: monthTasks.length,
    productivity: monthTasks.length > 0 ? Math.round((monthTasks.filter(t => t.status === TaskStatus.Done).length / monthTasks.length) * 100) : 0,
  };

  const chartData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayTasks = getTasksForDayByNumber(day);
      return {
        name: day.toString(),
        selesai: dayTasks.filter(t => t.status === TaskStatus.Done).length,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, year, month]);

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const chartTheme = {
    textColor: theme === 'dark' ? '#e2e8f0' : '#64748b',
    gridColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  };

  return (
    <div className="p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Tinjauan Bulanan</h1>
            <p className="text-slate-500 dark:text-slate-200 mt-1">Kalender dan statistik produktivitas.</p>
        </div>
        <div className="flex items-center bg-white dark:bg-slate-800 shadow-sm rounded-lg p-1 self-start sm:self-center">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5"/></button>
          <span className="w-36 sm:w-48 text-center font-semibold text-slate-700 dark:text-slate-200">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-xl shadow-sm">
          <div className="grid grid-cols-7 text-center font-semibold text-slate-500 dark:text-slate-200 text-xs sm:text-sm mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {blanks.map(b => <div key={`b-${b}`} className="h-20 sm:h-28"></div>)}
            {days.map(day => {
              const dayTasks = getTasksForDayByNumber(day);
              const completedTasks = dayTasks.filter(t => t.status === TaskStatus.Done && !t.id.includes('-projected-'));
              const pendingTasks = dayTasks.filter(t => t.status !== TaskStatus.Done || t.id.includes('-projected-'));
              const today = new Date();
              const isToday = today.getFullYear() === year &&
                              today.getMonth() === month &&
                              today.getDate() === day;
              const isSelected = selectedDay === day;

              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 sm:h-28 p-1.5 sm:p-2 border dark:border-slate-700 rounded-lg flex flex-col transition-all duration-200 cursor-pointer ${isToday ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-700' : 'bg-white dark:bg-slate-800'} ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
                >
                  <span className={`font-semibold text-sm sm:text-base ${isToday ? 'text-blue-600 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>{day}</span>
                  <div className="mt-1 space-y-1 flex-grow overflow-hidden text-xs">
                    {completedTasks.slice(0, 2).map(task => (
                      <div key={task.id} className="hidden sm:flex items-center text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/50 p-1 rounded" title={task.title}>
                        <CheckCircleIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                        <p className="truncate">{task.title}</p>
                      </div>
                    ))}
                     {completedTasks.length > 0 && (
                        <div className="sm:hidden flex items-center text-green-600 dark:text-green-400">
                             <CheckCircleIcon className="w-3 h-3 mr-1"/>
                             <span>{completedTasks.length}</span>
                        </div>
                    )}
                    
                    {pendingTasks.length > 0 && (
                      <div className="flex items-center text-amber-800 dark:text-amber-300 mt-1" title={`${pendingTasks.length} tugas tertunda`}>
                        <ClockIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                        <span>{pendingTasks.length}</span>
                      </div>
                    )}

                    {completedTasks.length > 2 && (
                         <div className="text-slate-500 dark:text-slate-200 mt-1 hidden sm:block">
                            + {completedTasks.length - 2} lagi
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-8">
            {selectedDay && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Tugas untuk {new Date(year, month, selectedDay).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="p-1 text-slate-400 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                {tasksForSelectedDay.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {tasksForSelectedDay.map(task => (
                      <div key={task.id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 flex items-start gap-3">
                        <span className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ${task.status === TaskStatus.Done ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        <div>
                          <p className={`font-medium ${task.status === TaskStatus.Done ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
                          <div className="flex items-center text-xs text-slate-500 dark:text-slate-200 mt-1">
                            <ClockIcon className="w-3 h-3 mr-1.5" />
                            <span>{new Date(task.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')} - {new Date(task.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-200 py-4">Tidak ada tugas yang dijadwalkan untuk hari ini.</p>
                )}
              </div>
            )}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Statistik Bulan Ini</h3>
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <span className="font-semibold text-slate-600 dark:text-slate-200">Total Tugas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{stats.total}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <span className="font-semibold text-green-700 dark:text-green-300">Selesai</span>
                    <span className="font-bold text-green-800 dark:text-green-200">{stats.done}</span>
                </div>
                <div className="flex justify-between p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <span className="font-semibold text-yellow-700 dark:text-yellow-300">Tertunda</span>
                    <span className="font-bold text-yellow-800 dark:text-yellow-200">{stats.pending}</span>
                </div>
                <div className="flex justify-between p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">Produktivitas</span>
                    <span className="font-bold text-blue-800 dark:text-blue-200">{stats.productivity}%</span>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-2">Tugas Selesai per Hari</h4>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridColor}/>
                            <XAxis dataKey="name" fontSize={12} tick={{ fill: chartTheme.textColor }}/>
                            <YAxis allowDecimals={false} fontSize={12} tick={{ fill: chartTheme.textColor }}/>
                            <Tooltip 
                                cursor={{fill: 'rgba(125, 125, 125, 0.2)'}}
                                contentStyle={{ 
                                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                                }}
                            />
                            <Bar dataKey="selesai" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyView;
