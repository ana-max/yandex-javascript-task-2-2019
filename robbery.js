'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

const DAYS_OF_WEEK = {
    MONDAY: {
        name: 'ПН',
        code: 10000,
        previous: 'SUNDAY',
        next: 'TUESDAY'
    },
    TUESDAY: {
        name: 'ВТ',
        code: 20000,
        previous: 'MONDAY',
        next: 'WEDNESDAY'
    },
    WEDNESDAY: {
        name: 'СР',
        code: 30000,
        previous: 'TUESDAY',
        next: 'THURSDAY'
    },
    THURSDAY: {
        name: 'ЧТ',
        code: 40000,
        previous: 'WEDNESDAY',
        next: 'FRIDAY'
    },
    FRIDAY: {
        name: 'ПТ',
        code: 50000,
        previous: 'THURSDAY',
        next: 'SATURDAY'
    },
    SATURDAY: {
        name: 'СБ',
        code: 60000,
        previous: 'FRIDAY',
        next: 'SUNDAY'
    },
    SUNDAY: {
        name: 'ВС',
        code: 70000,
        previous: 'SATURDAY',
        next: 'MONDAY'
    },
    getDayObj: (dayName) => Object.values(DAYS_OF_WEEK).filter(day => day.name === dayName)[0],
    getPrevious: (dayOfWeek) => DAYS_OF_WEEK[DAYS_OF_WEEK.getDayObj(dayOfWeek).previous].name,
    getNext: (dayOfWeek) => DAYS_OF_WEEK[DAYS_OF_WEEK.getDayObj(dayOfWeek).next].name
};

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    // Расписание в единый часовой пояс
    const scheduleWithGeneralOffset = getScheduleWithGeneralOffset(schedule, workingHours);
    // Расписание работы банка с ПН по СР
    const bankSchedule = getScheduleOfBank(workingHours);
    const [scheduleSegments, bankSegments] = convertSchedulesToSetsOfSegments(
        scheduleWithGeneralOffset,
        bankSchedule
    );
    const allBusyUnions = getUnionOfThreeSetsOfSegments(scheduleSegments, bankSegments);
    // Разность между отрезками работы банка и отрезками занятости банды
    const timesForRobbery = getAllFreeIntersections(allBusyUnions, bankSegments, duration);
    const hasTimeForRobbery = timesForRobbery.length > 0;
    let numRobStart;
    if (hasTimeForRobbery) {
        const robFirstInterval = timesForRobbery[timesForRobbery.length - 1];
        numRobStart = robFirstInterval.start;
    }

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return hasTimeForRobbery;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!hasTimeForRobbery) {
                return '';
            }
            const [dayOfWeek, hoursMinutesOffset] = numberToTime(numRobStart).split(' ');
            const timeRobStart = {
                dayOfWeek: dayOfWeek,
                time: parseTime(hoursMinutesOffset)
            };

            return template
                .replace('%DD', timeRobStart.dayOfWeek)
                .replace('%HH',
                    (timeRobStart.time.hours < 10) ? `0${timeRobStart.time.hours}`
                        : timeRobStart.time.hours)
                .replace('%MM',
                    (timeRobStart.time.minutes < 10) ? `0${timeRobStart.time.minutes}`
                        : timeRobStart.time.minutes);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!hasTimeForRobbery) {
                return false;
            }
            const newRobStart = tryGetOtherStartTime(
                timesForRobbery,
                numRobStart,
                duration
            );
            if (newRobStart) {
                numRobStart = newRobStart;

                return true;
            }

            return false;
        }
    };
}

function tryGetOtherStartTime(allUnions, currentRobStart, duration) {
    const startPlusHalfAnHour = addHalfAnHour(currentRobStart);
    allUnions = allUnions.sort(({ start: xStart }, { start: yStart }) => xStart - yStart);
    if (tryFindAnotherStartTimeWithPlusHalf(startPlusHalfAnHour, allUnions, duration)) {
        return startPlusHalfAnHour;
    }

    return tryFindAnotherStartTimeInSchedule(allUnions, currentRobStart);
}

function tryFindAnotherStartTimeWithPlusHalf(startPlusHalfAnHour, allUnions, duration) {
    for (const segment of allUnions) {
        if (segment.start.toString()[0] === startPlusHalfAnHour.toString()[0] &&
            segment.start <= startPlusHalfAnHour &&
            startPlusHalfAnHour <= segment.end &&
            segment.end - startPlusHalfAnHour >= duration) {
            return startPlusHalfAnHour;
        }
    }
}

function tryFindAnotherStartTimeInSchedule(allUnions, currentStart) {
    allUnions = allUnions.sort(({ start: xStart }, { start: yStart }) => xStart - yStart);
    for (const segment of allUnions) {
        if (segment.start - currentStart >= 30) {
            return segment.start;
        }
    }
}

function addHalfAnHour(numRobStart) {
    const robTime = numberToTime(numRobStart);
    const timeObject = parseTime(robTime.split(' ')[1]);
    timeObject.dayOfWeek = robTime.split(' ')[0];
    if (timeObject.minutes + 30 >= 60) {
        timeObject.minutes = (timeObject.minutes + 30) % 60;
        timeObject.hours += 1;
        if (timeObject.hours === 24) {
            timeObject.hours = 0;
            timeObject.dayOfWeek = DAYS_OF_WEEK.getNext(timeObject.dayOfWeek);
        }
    } else {
        timeObject.minutes += 30;
    }

    return timeToNumber(
        `${timeObject.dayOfWeek} ${timeObject.toString()}`
    );
}

function workWithHandlersForNotes(
    schedule,
    firstHandlerForNote,
    necessaryParameterForHandler
) {
    return Object.keys(schedule).reduce((newSchedule, current) => {
        newSchedule[current] = schedule[current].reduce((newNote, currentNote) =>
            newNote.concat(firstHandlerForNote(currentNote, necessaryParameterForHandler)), []);

        return newSchedule;
    }, {});
}

/**
 * Перевод всего расписания в единый часовой пояс
 * @param{Object} schedule - Расписание банды
 * @param{Object} workingHours - Время работы банка
 * @returns {Object} scheduleWithGeneralOffset - Расписание банды в едином часовом поясе
 */
function getScheduleWithGeneralOffset(schedule, workingHours) {
    const bankOffset = parseTime(workingHours.from).offset;

    return workWithHandlersForNotes(
        schedule,
        (note, offset) => [{
            from: convertTimeForOtherOffset(note.from, offset),
            to: convertTimeForOtherOffset(note.to, offset)
        }],
        bankOffset);
}

function convertTimeForOtherOffset(dataInNote, newOffset) {
    const [dayOfTheWeek, hoursMinutesOffset] = dataInNote.split(' ');
    const date = {
        dayOfTheWeek: dayOfTheWeek,
        time: parseTime(hoursMinutesOffset)
    };
    if (date.time.offset === newOffset) {
        return dataInNote;
    }
    const offsetDifference = newOffset - date.time.offset;
    date.time.offset = newOffset;
    date.time.hours = date.time.hours + offsetDifference;
    while (date.time.hours < 0) {
        date.time.hours = date.time.hours + 24;
        date.dayOfTheWeek = DAYS_OF_WEEK.getPrevious(date.dayOfTheWeek);
    }
    while (date.time.hours >= 24) {
        date.time.hours = date.time.hours - 24;
        date.dayOfTheWeek = DAYS_OF_WEEK.getNext(date.dayOfTheWeek);
    }

    return `${date.dayOfTheWeek} ${date.time}`;
}

function parseTime(time) {
    const [hours, minutes, offset] = time.split(/[:+]+/).map(Number);

    return {
        hours: hours,
        minutes: minutes,
        offset: offset,
        toString() {
            const strHours = this.hours < 10 ? `0${this.hours}` : this.hours;
            const strMinutes = this.minutes < 10 ? `0${this.minutes}` : this.minutes;

            return `${strHours}:${strMinutes}+${this.offset}`;
        }
    };
}

function getScheduleOfBank(workingHours) {
    return [
        {
            from: `${DAYS_OF_WEEK.MONDAY.name} ${workingHours.from}`,
            to: `${DAYS_OF_WEEK.MONDAY.name} ${workingHours.to}`
        },
        {
            from: `${DAYS_OF_WEEK.TUESDAY.name} ${workingHours.from}`,
            to: `${DAYS_OF_WEEK.TUESDAY.name} ${workingHours.to}`
        },
        {
            from: `${DAYS_OF_WEEK.WEDNESDAY.name} ${workingHours.from}`,
            to: `${DAYS_OF_WEEK.WEDNESDAY.name} ${workingHours.to}`
        }
    ];
}

function convertAllSchedulesToSegments(bandSchedule, bankSchedule) {
    const bandSegments = getSegmentsDivideByDay(
        Object.values(bandSchedule).map(schedule => convertScheduleToSegment(schedule))
    );
    const bankSegments = convertScheduleToSegment(bankSchedule);

    return [bandSegments, bankSegments];
}

function Segment(start, end) {
    this.start = start;
    this.end = end;

    return this;
}

function convertScheduleToSegment(schedule) {
    return schedule.map(note => new Segment(timeToNumber(note.from), timeToNumber(note.to)));
}

function timeToNumber(noteInSchedule) {
    const [dayOfWeek, time] = noteInSchedule.split(' ');
    const date = {
        dayOfWeek: DAYS_OF_WEEK.getDayObj(dayOfWeek),
        time: parseTime(time)
    };

    return date.dayOfWeek.code + date.time.hours * 60 + date.time.minutes;
}

function numberToTime(number) {
    const dayCode = number.toString()[0] * 10000;
    const dayOfWeek = Object.values(DAYS_OF_WEEK).filter(x => x.code === dayCode)[0].name;

    const timeInMinutes = number - dayCode;
    const hours = Math.trunc(timeInMinutes / 60);
    const strHours = (hours < 10) ? `0${hours}` : hours;
    const minutes = timeInMinutes - hours * 60;
    const strMinutes = (minutes < 10) ? `0${minutes}` : minutes;

    return `${dayOfWeek} ${strHours}:${strMinutes}`;
}

function getSegmentsDivideByDay(segments) {
    return segments.map(currentSegments =>
        currentSegments.reduce((divideCurrent, currentSegment) => {
            let end = currentSegment.end;
            const start = currentSegment.start;
            const startDayCode = start.toString()[0] * 10000;
            let endDayCode = end.toString()[0] * 10000;
            while (startDayCode !== endDayCode) {
                divideCurrent.push(new Segment(endDayCode, end));
                end = endDayCode - 1;
                endDayCode = end.toString()[0] * 10000;
            }
            divideCurrent.push(new Segment(start, end));

            return divideCurrent;
        }, [])
    );
}

function groupSegmentsByDayCode(segments) {
    return segments.reduce((grByDay, current) => {
        const dayCode = Number(current.start.toString()[0]);
        if (!grByDay[dayCode]) {
            grByDay[dayCode] = [];
        }
        grByDay[dayCode].push(current);

        return grByDay;
    }, {});
}

function cutSegmentsForConstraints(segmentsGroups, constraints) {
    return Object.values(segmentsGroups).map(segmentsGroup =>
        Object.values(segmentsGroup).map(segments =>
            segments.map(segment => {
                const constraint = constraints[segment.start.toString()[0]][0];
                if (constraint.end < segment.start || constraint.start > segment.end) {
                    return [];
                }
                if (constraint.end < segment.end) {
                    segment.end = constraint.end;
                }
                if (constraint.start > segment.start) {
                    segment.start = constraint.start;
                }

                return segment;
            })
        ));
}

function getUnionOfThreeSetsOfSegments(threeSetsOfSegments) {
    const [first, second, third] = threeSetsOfSegments.map(
        segments => segments.reduce((oneSegmentsArray, current) =>
            oneSegmentsArray.concat(current), [])
    );
    const unionOfTwo = getUnionOfTwoSetsOfSegments(
        first.concat(second)
    );

    return getUnionOfTwoSetsOfSegments(unionOfTwo.concat(third));
}

function getUnionOfTwoSetsOfSegments(twoSetsOfSegments) {
    const allSegments = twoSetsOfSegments.slice(0, twoSetsOfSegments.length)
        .filter(x => x.length !== 0);
    allSegments.sort(({ start: xStart }, { start: yStart }) => xStart - yStart);

    return allSegments.reduce((union, current) => {
        if (current.length === 0) {
            return union;
        }
        if (union.length === 0) {
            union.push(current);

            return union;
        }
        const firstSegment = union.pop();
        const intersection = getUnionOfTwoSegmentsWithDuration(
            firstSegment,
            current
        );
        if (intersection) {
            union.push(intersection);
        } else {
            union.push(firstSegment);
            union.push(current);
        }

        return union;
    }, []);
}

function getUnionOfTwoSegmentsWithDuration(first, second) {
    const start = Math.min(first.start, second.start);
    const end = Math.max(first.end, second.end);
    if (first.end > second.start) {
        return new Segment(start, end);
    }
}

function getAllFreeIntersections(allBusyUnions, bankSegments, duration) {
    let groupOfBusyDay = groupSegmentsByDayCode(allBusyUnions);
    // Если запись о дне не встречается, значит целый день свободен
    if (!groupOfBusyDay[1]) {
        groupOfBusyDay[1] = [new Segment(bankSegments[1][0].start, bankSegments[1][0].start)];
    }
    if (!groupOfBusyDay[2]) {
        groupOfBusyDay[2] = [new Segment(bankSegments[2][0].start, bankSegments[2][0].start)];
    }
    if (!groupOfBusyDay[3]) {
        groupOfBusyDay[3] = [new Segment(bankSegments[3][0].start, bankSegments[3][0].start)];
    }

    return Object.keys(groupOfBusyDay).reduce((times, currentScheduleOfDay) => {
        let start = bankSegments[currentScheduleOfDay][0].start;
        times = times.concat(
            groupOfBusyDay[currentScheduleOfDay].reduce((freeTimes, currentSegment) => {
                if (currentSegment.start - start >= duration && currentSegment.start !== start) {
                    freeTimes.push(new Segment(start, currentSegment.start));
                    start = currentSegment.end;
                }
                start = currentSegment.end;

                return freeTimes;
            }, [])
        );

        const workingDayEnd = bankSegments[currentScheduleOfDay][0].end;
        if (start !== workingDayEnd && workingDayEnd - start >= duration) {
            times.push(new Segment(start, workingDayEnd));
        }

        return times;
    }, [])
        .reverse();
}

function convertSchedulesToSetsOfSegments(scheduleWithGeneralOffset, bankSchedule) {
    let [scheduleSegments, bankSegments] = convertAllSchedulesToSegments(
        scheduleWithGeneralOffset,
        bankSchedule
    );
    scheduleSegments = scheduleSegments.map(sh => groupSegmentsByDayCode(sh));
    bankSegments = groupSegmentsByDayCode(bankSegments);
    // Убираем лишние дни, не подходящие по расписанию, оставляем только ПН, ВТ, СР
    scheduleSegments = scheduleSegments.map(
        segments => {
            segments = {
                1: segments['1'] || [],
                2: segments['2'] || [],
                3: segments['3'] || []
            };

            return segments;
        }
    );
    scheduleSegments = cutSegmentsForConstraints(
        scheduleSegments,
        bankSegments
    );

    return [
        scheduleSegments,
        bankSegments
    ];
}

module.exports = { getAppropriateMoment, isStar };

