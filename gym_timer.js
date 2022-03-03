const DateTime = luxon.DateTime;
let alarmTime = null;
let Clock = null;
const endBell = new Audio("bell-2s.wav");
const alarmSound = new Audio('Alarm-ringtone.mp3');
const beepSound = new Audio("boxing-bell.mp3");
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
    const ratio = $(window).height() / div.height();
    if (ratio <= 1) {
        div.css('transform', `scale(${ratio})`);
    } else {
        div.css('transform', 'scale(1)');
    }
}

function liveClock() {
    Clock = setInterval(() => {
        setDate();
        if (alarmTime && alarmTime.hasSame(DateTime.now(), 'hour') && alarmTime.hasSame(DateTime.now(), 'minutes')) {
            alarmSound.play();
            alarmTime = null;
        }
    }, 1000);
}

function setDate() {
    const date = DateTime.now().toFormat('cccc LLLL d, yyyy');
    const time = DateTime.now().toFormat('t');
    $('.header .date').text(date);
    $('.header .time').text(time);
}

function setEvents(timer) {
    $('#round').text(`Round ${timer.currentRound}`);
    $('#start_button').click(() => {
        timer.startTimer();
        toggleStartPauseButton();
    });
    $('#pause_button').click(() => {
        timer.pauseTimer();
        toggleStartPauseButton();
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
    $('#alarm_on_off').change(e => {
        if (e.currentTarget.value === 'on') {
            setAlarm();
        } else {
            alarmTime = null;
        }
    });
    $('#alarm_hour').change(e => {
        if (alarmTime) {
            setAlarm();
        }
    });
    $('#alarm_minute').change(e => {
        if (alarmTime) {
            setAlarm();
        }
    });
    $('#alarm_am_pm').change(e => {
        if (alarmTime) {
            setAlarm();
        }
    });
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
    const currentTime = new Date();
    const alarmHour = $('#alarm_hour').val();
    const alarmMins = $('#alarm_minute').val();
    const alarmAmPM = $('#alarm_am_pm').val();
    const formatStr = `${currentTime.getMonth()+1} ${currentTime.getDate()} ${currentTime.getFullYear()} ${alarmHour}:${alarmMins} ${alarmAmPM}`;
    alarmTime = DateTime.fromFormat(formatStr, "M d yyyy t");
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
        beepSound.play();
        this.timer = setInterval(() => {
            that.setTime();
            if (that.timerState === 'prepare' && that.time === 0) {
                that.timerState = 'round';
                that.time = that.program.roundTime;
            } else if (that.timerState === 'round' && that.time === that.program.warningTime + 1) {
                that.timerState = 'warning';
                beepSound.play();
                that.time--;
            } else if (that.timerState === 'warning' && that.time === 0) {
                that.timerState = 'rest';
                that.time = that.program.restTime;
                endBell.play();
            } else if (that.timerState === 'rest' && that.currentRound < that.program.rounds && that.time === that.program.prepareTime) {
                that.timerState = 'prepare';
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
        beepSound.play();
        this.timer = setInterval(() => {
            that.setTime();
            if (that.timerState === 'prepare' && that.time === that.program.prepareTime) {
                that.timerState = 'round';
                that.time = 0;
                beepSound.play();
            } else if (that.timerState === 'round' && that.time === that.program.roundTime - that.program.warningTime - 1) {
                that.timerState = 'warning';
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
        $('#timer').text(secsToTime(this.time));
        $('#timer').addClass(this.timerState);
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