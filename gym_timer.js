let alarmTime = null;
let Clock = null;

// Audio set up
const endBell = new Howl({ src: ['bell-2s.wav'] });
const alarmSound = new Howl({ src: ['alarm.mp3'] });
const bellSound = new Howl({ src: ['boxing-bell.mp3'] });
const beepSound = new Howl({ src: ['sport-beep.m4a'] });

const defaultProgram = {
    name: '[New]',
    rounds: 1,
    prepareTime: 5,
    roundTime: 10,
    warningTime: 5,
    restTime: 10,
};
let currentProgram = defaultProgram;
$(document).ready(function() {
    setDate();
    $('#alarm_on_off').val('off');
    setAlarm();
    liveClock();

    const timer = new GymTimer();
    const currentProgramName = localStorage.getItem('currentProgram');
    if (currentProgramName) {
        currentProgram = localStorage.getItem(currentProgramName);
        if (currentProgram) {
            currentProgram = JSON.parse(currentProgram);
        }
    }
    setProgram(timer, currentProgram);

    const currentTeamLogo = localStorage.getItem('teamLogo');
    if(currentTeamLogo) {
        $('.team_logo').attr('src', currentTeamLogo);
    }

    const currentSettings = localStorage.getItem('settings');
    if (currentSettings) {
        const settings = JSON.parse(currentSettings);
        setSettings(settings, timer);
    }

    setEvents(timer);
    setButtons(timer);
    fillDiv($('.gym_timer'));

    $( window ).resize(function() {
        fillDiv($('.gym_timer'));
    });
});

function fillDiv(div) {
    const transformVal = [];
    const ratio = $(window).height() / div.height();
    if (ratio <= 1) {
        transformVal.push(`scale(${ratio})`);
        // transformVal.push('translateY(-5vh)');

    } else {
        transformVal.push('scale(1)');
    }

    // if ($(window).height() > $(window).width()) {
    //     transformVal.push('rotate(90deg)');
    //     transformVal.push('translateX(25vh)');
    // }

    div.css('transform', transformVal.join(' '));
}

function liveClock() {
    Clock = setInterval(() => {
        setDate();
        if (alarmTime ) {
            const date = new Date();
            if (date.getHours() === alarmTime.getHours() && date.getMinutes() === alarmTime.getMinutes()) {
                alarmSound.play();
                alarmTime = null;
                $('#alarm_on_off').val('off');
            }
        }
    }, 1000);
}

function setDate() {
    try {
        const date = new Date();
        const weekday = getWeekday(date);
        const month = getMonth(date);
        const dateStr = `${weekday} ${month} ${date.getDate() + 1}, ${date.getFullYear()}`;
        const time = formatAMPM(date);
        $('.header .date').text(dateStr);
        $('.header .time').text(time);
    } catch (e) {
        console.error(e);
    }

}

function setEvents(timer) {
    $('#round').text(`Round ${timer.currentRound}`);
    $('#start_button').click(() => {
        timer.toggleTimer();
        toggleStartPauseButton();
    });
    $('#pause_button').click(() => {
        timer.toggleTimer();
        toggleStartPauseButton();
    });
    $(document).keydown((event) => {
        if (event.charCode === 0 || event.keyCode === 32) {
            timer.toggleTimer();
            toggleStartPauseButton();
        }
    });
    $('#rounds_button').click(() => setTimeDialog('Rounds', timer.program.rounds, () => {
        timer.program.rounds = $('#time_dialog input').val();
        setButtons(timer);
    }));
    $('#prepare_time_button').click(() => setTimeDialog('Prepare', secsToTime(timer.program.prepareTime), () => {
        timer.program.prepareTime = timeToSecs($('#time_dialog input').val());
        setButtons(timer);
    }));
    $('#round_time_button').click(() => setTimeDialog('Round', secsToTime(timer.program.roundTime), () => {
        timer.program.roundTime = timeToSecs($('#time_dialog input').val());
        setButtons(timer);
    }));
    $('#warning_time_button').click(() => setTimeDialog('Warning', secsToTime(timer.program.warningTime), () => {
        timer.program.warningTime = timeToSecs($('#time_dialog input').val());
        setButtons(timer);
    }));
    $('#rest_time_button').click(() => setTimeDialog('Rest', secsToTime(timer.program.restTime), () => {
        timer.program.restTime = timeToSecs($('#time_dialog input').val());
        setButtons(timer);
    }));
    $('#program_button').click(() => setProgramDialog(timer));
    $('#refresh_button').click(() => {
        timer.currentRound = 1;
        $('#round').text(`Round ${timer.currentRound}`);
        timer.stopTimer();
    });
    $('.team_logo').click(() => {
        $('#team_logo_input').trigger('click');
    });
    $('#team_logo_input').change((e) => {
       const file = e.currentTarget.files[0];
        const reader = new FileReader();

        reader.addEventListener("load", function () {
            $('.team_logo').attr('src', reader.result);
            localStorage.setItem('teamLogo', reader.result);
        }, false);

        if (file) {
            reader.readAsDataURL(file);
        }
    });
    $('#settings_button').click(e => setSettingsDialog());
    $('#background_color').change(e => {
        $('body').css({
            background: e.currentTarget.value,
            color: e.currentTarget.value === 'black' ? 'white' : 'black',
        });
        if (e.currentTarget.value === 'black') {
            $('.logo.black').show();
            $('.logo.white').hide();
        } else {
            $('.logo.white').show();
            $('.logo.black').hide();
        }
    });
    $('#timer_type').change(e => {
       timer.timerType = e.currentTarget.value;
    });
    $('#alarm_on_off').change(e => setAlarm());
    $('#alarm_hour').change(e => setAlarm());
    $('#alarm_minute').change(e => setAlarm());
    $('#alarm_am_pm').change(e => setAlarm());
}

function toggleStartPauseButton() {
    $('#start_button').toggle();
    $('#pause_button').toggle();
}

function setSettingsDialog() {
    $('#settings_dialog').dialog({
        title: 'Settings',
        width: '50%',
        buttons: [
            {
                text: 'Save',
                click: () => {
                    const settingsObject = {
                        backgroundColor: $('#background_color').val(),
                        color: $('#background_color').val() === 'black' ? 'white' : 'black',
                        timerType: $('#timer_type').val(),
                    };
                    localStorage.setItem('settings', JSON.stringify(settingsObject));
                    $('#settings_dialog').dialog('close');
                }
            }
        ]
    });
}

function setAlarm() {
    if ($('#alarm_on_off').val() === 'on') {
        const currentTime = new Date();
        const alarmHour = $('#alarm_hour').val();
        const alarmMins = $('#alarm_minute').val();
        const alarmAmPM = $('#alarm_am_pm').val();
        const d = convertTimetoObj(parseInt(alarmHour), parseInt(alarmMins), alarmAmPM);
        alarmTime = d;
    } else {
        alarmTime = null;
    }
}

function setSettings(settings, timer) {
    if (settings.backgroundColor === 'black') {
        $('.logo.black').show();
        $('.logo.white').hide();
    } else {
        $('.logo.white').show();
        $('.logo.black').hide();
    }
    $('#background_color').val(settings.backgroundColor);
    $('body').css({
        backgroundColor: settings.backgroundColor,
        color: settings.color,
    });
    $('#timer_type').val(settings.timerType);
    timer.timerType = settings.timerType;
}

function setTimeDialog(label, value, callback) {
    $('#time_dialog label').text(label);
    $('#time_dialog input').val(value);
    $('#time_dialog').dialog({
        title: 'Set Time',
        width: '50%',
        buttons: [
            {
                text: 'Save',
                click: () => {
                    callback();
                    $('#time_dialog').dialog( "close" );
                }
            }
        ]
    });
}

function setProgramDialog(timer) {
    setInputData(timer.program);
    const programs = Object.keys(localStorage);
    const allPrograms = programs.reduce((list, p) => {
        if (p.indexOf("program_") === 0) {
            let option = `<option>${p.replace('program_', '')}</option>`;
            if (p === localStorage.getItem('currentProgram')) {
                option = `<option selected>${p.replace('program_', '')}</option>`;
            }
            list.push(option);
        }
        return list;
    }, []);
    if (allPrograms.length > 0) {
        $('#program_list').show();
        $('#program_list').html(allPrograms.join(''));
    } else {
        $('#program_list').hide();
    }
    $('#program_list').change((e) => {
        const program = localStorage.getItem(e.currentTarget.value);
        if (program) {
            setInputData(JSON.parse(program));
        }
    });
    $('#program_dialog').dialog({
        title: 'Program Settings',
        width: '50%',
        buttons: [
            {
                text: 'Save',
                click: () => {
                    const selectedProgram = $('#program_list').val();
                    const program = getInputData();
                    timer.program = {
                        name: selectedProgram,
                        ...program
                    };
                    localStorage.setItem('currentProgram', timer.program.name);
                    setButtons(timer);
                    $('#program_dialog').dialog( "close" );
                }
            },
            {
                text: 'Save As',
                click: () => {
                    $('#save_as_dialog').dialog({
                        title: 'Save As',
                        width: '50%',
                        buttons: [
                            {
                                text: 'Save',
                                click: () => {
                                    const name = $('#save_as_name_input').val();
                                    localStorage.setItem('currentProgram', `program_${name}`);
                                    const program = {
                                        name: `program_${name}`,
                                        ...getInputData(),
                                    };
                                    localStorage.setItem(`program_${name}`, JSON.stringify(program));
                                    timer.program = program;
                                    $('#save_as_dialog').dialog('close');
                                    setButtons(timer);
                                }
                            }
                        ]
                    });
                    $('#program_dialog').dialog( "close" );
                }
            }
        ]
    });
}

function setInputData(program) {
    $('#program_dialog input#rounds_input').val(program.rounds);
    $('#program_dialog input#prepare_input').val(secsToTime(program.prepareTime));
    $('#program_dialog input#round_input').val(secsToTime(program.roundTime));
    $('#program_dialog input#warning_input').val(secsToTime(program.warningTime));
    $('#program_dialog input#rest_input').val(secsToTime(program.restTime));
}

function getInputData() {
    return {
        rounds: parseInt($('#program_dialog input#rounds_input').val()),
        prepareTime: timeToSecs($('#program_dialog input#prepare_input').val()),
        roundTime: timeToSecs( $('#program_dialog input#round_input').val()),
        warningTime: timeToSecs($('#program_dialog input#warning_input').val()),
        restTime: timeToSecs($('#program_dialog input#rest_input').val()),
    };
}

function setButtons(timer) {
    $('#rounds_button').text(`Rounds: ${timer.program.rounds}`);
    $('#prepare_time_button').text(`Prepare: ${secsToTime(timer.program.prepareTime)}`);
    $('#round_time_button').text(`Round: ${secsToTime(timer.program.roundTime)}`);
    $('#warning_time_button').text(`Warning: ${secsToTime(timer.program.warningTime)}`);
    $('#rest_time_button').text(`Rest: ${secsToTime(timer.program.restTime)}`);
    $('#program_button').text(`Program: ${timer.program.name.replace('program_', '')}`)
}

function setProgram(timer, program) {
    if (program) {
        timer.program = program;
    }
}

class GymTimer {
    timerType = 'stopwatch';
    hasTimerStarted = false;
    time = 0;
    program = {};
    timerState = 'prepare';
    currentRound = 1;
    toggleTimer() {
        if (this.hasTimerStarted) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }
    startTimer() {
        if (!this.hasTimerStarted) {
            this.hasTimerStarted = true;
            if (this.timerType === 'countdown') {
                this.countdownTimer();
            } else if (this.timerType === 'stopwatch') {
                this.stopwatchTimer();
            }
        }
    }
    countdownTimer() {
        const that = this;
        that.time = that.program.prepareTime;
        this.timer = setInterval(() => {
            that.setTime();
            if(that.timerState === 'prepare' && that.time === that.program.prepareTime) {
                $('#timer').addClass(that.timerState);
                beepSound.play();
                that.time--;
            } else if (that.timerState === 'prepare' && that.time === 0) {
                that.timerState = 'round';
                $('#timer').addClass(that.timerState);
                that.time = that.program.roundTime;
                bellSound.play();
            } else if (that.timerState === 'round' && that.time === that.program.warningTime) {
                that.timerState = 'warning';
                $('#timer').addClass(that.timerState);
                beepSound.play();
                that.time--;
            } else if (that.timerState === 'warning' && that.time === 0) {
                that.timerState = 'rest';
                $('#timer').addClass(that.timerState);
                that.time = that.program.restTime;
                endBell.play();
            } else if (that.timerState === 'rest' && that.currentRound < that.program.rounds && that.time === that.program.prepareTime) {
                that.timerState = 'prepare';
                $('#timer').addClass(that.timerState);
                that.time = that.program.prepareTime;
                that.currentRound++;
            } else if (that.timerState === 'rest' && that.time === 0) {
                that.stopTimer();
                toggleStartPauseButton();
            } else {
                that.time--;
            }
        }, 1000);
    }
    stopwatchTimer() {
        const that = this;
        this.timer = setInterval(() => {
            that.setTime();
            if (that.timerState === 'prepare' && that.time === 0) {
                beepSound.play();
                that.time++;
            } else if (that.timerState === 'prepare' && that.time === that.program.prepareTime) {
                that.timerState = 'round';
                that.time = 0;
                bellSound.play();
            } else if (that.timerState === 'round' && that.time === that.program.roundTime - that.program.warningTime) {
                that.timerState = 'warning';
                $('#timer').addClass(that.timerState);
                beepSound.play();
                that.time++;
            } else if (that.timerState === 'warning' && that.time === that.program.roundTime) {
                that.timerState = 'rest';
                that.time = 0;
                endBell.play();
            } else if (that.timerState === 'rest' && that.currentRound < that.program.rounds && that.time === that.program.restTime - that.program.prepareTime) {
                that.timerState = 'prepare';
                that.time = 0;
                that.currentRound++;
            } else if(that.timerState === 'rest' && that.time === that.program.restTime) {
                that.stopTimer();
                toggleStartPauseButton();
            } else {
                that.time++;
            }
        }, 1000);
    }
    setTime() {
        $('#timer').removeClass();
        $('#timer').addClass(this.timerState);
        $('#timer').text(secsToTime(this.time));
        $('#round').text(`Round ${this.currentRound}`);
    }
    stopTimer() {
        clearInterval(this.timer);
        this.timerState = 'prepare';
        this.time = 0;
        this.timer = null;
        this.currentRound = 1;
        this.hasTimerStarted = false;
        $('#timer').removeAttr('class');
        $('#timer').text(secsToTime(this.time));
    }
    pauseTimer() {
        clearInterval(this.timer);
        this.hasTimerStarted = false;
    }
}

function secsToTime(secs) {
    return new Date(secs * 1000).toISOString().substr(14, 5);
}

function timeToSecs(str) {
    var p = str.split(':'),
        s = 0, m = 1;

    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }

    return s;
}

function getWeekday(dateObj) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getDay()];
}

function getMonth(dateObj) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[dateObj.getMonth()];
}

function formatAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

function convertTimetoObj(hours, mins, amPm) {
    // 12:00 AM
    let h, m;
    if (amPm === 'AM') {
        if (hours === 12) {
            h = 0;
        } else {
            h = hours;
        }
        m = mins;
    } else {
        h = hours + 12;
        m = mins
    }
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m);
    return d;
}