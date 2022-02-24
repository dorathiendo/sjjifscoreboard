$(document).ready(function() {
    setDate();

    const timer = new GymTimer();
    const currentProgramName = localStorage.getItem('currentProgram');
    if (currentProgramName) {
        const currentProgram = localStorage.getItem(currentProgramName);
        if (currentProgram) {
            setProgram(timer, JSON.parse(currentProgram));
        }
    }

    const currentTeamLogo = localStorage.getItem('teamLogo');
    if(currentTeamLogo) {
        $('.team_logo').attr('src', currentTeamLogo);
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
    }
}

function setDate() {
    const DateTime = luxon.DateTime;
    const date = DateTime.now().toFormat('cccc LLLL d, yyyy');
    const time = DateTime.now().toFormat('t');
    $('.header .date').text(date);
    $('.header .time').text(time);
}

function setEvents(timer) {
    $('#round').text(`Round ${timer.currentRound}`);
    $('#start_button').click(() => timer.startTimer());
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
    $('.team_logo').click(() => {
        $('#team_logo_input').click();
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
}

function setTimeDialog(label, value, callback) {
    $('#time_dialog label').text(label);
    $('#time_dialog input').val(value);
    $('#time_dialog').dialog({
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
        if (p !== "currentProgram") {
            let input =  `<input type="radio" id="${p}" name="programs" />`;
            if (p === localStorage.getItem('currentProgram')) {
                input = `<input type="radio" checked id="${p}" name="programs" />`;
            }
            list.push(`<div class="radio_wrapper">${input} <label for="${p}">${p}</label></div>`);
        }
        return list;
    }, []);
    $('#program_list').html(allPrograms.join(''));
    $('#program_list input').change((e) => {
        const program = localStorage.getItem(e.currentTarget.id);
        if (program) {
            setInputData(JSON.parse(program));
        }
    });
    $('#program_dialog').dialog({
        buttons: [
            {
                text: 'Save',
                click: () => {
                    const selectedProgram = $('#program_list input:checked').attr('id');
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
                        buttons: [
                            {
                                text: 'Save',
                                click: () => {
                                    const name = $('#save_as_name_input').val();
                                    localStorage.setItem('currentProgram', name);
                                    const program = {
                                        name,
                                        ...getInputData(),
                                    };
                                    localStorage.setItem(name, JSON.stringify(program));
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
    $('#program_button').text(`Program: ${timer.program.name}`)
}

function setProgram(timer, program) {
    if (program) {
        timer.program = program;
    }
}

class GymTimer {
    hasTimerStarted = false;
    time = 0;
    program = {
        name: '[New]',
        rounds: 2,
        prepareTime: 5,
        roundTime: 10,
        warningTime: 5,
        restTime: 5,
    };
    timerState = 'prepare';
    currentRound = 1;
    startTimer() {
        if (!this.hasTimerStarted) {
            const that = this;
            that.hasTimerStarted = true;
            let timer = setInterval(() => {
                if (that.timerState === 'prepare' && that.time === that.program.prepareTime) {
                    that.timerState = 'round';
                    that.time = 0;
                } else if (that.timerState === 'round' && that.time === that.program.roundTime - that.program.warningTime) {
                    that.timerState = 'warning';
                    that.time++;
                } else if (that.timerState === 'warning' && that.time === that.program.roundTime) {
                    that.timerState = 'rest';
                    that.time = 0;
                } else if (that.timerState === 'rest' && that.time === that.program.restTime) {
                    that.timerState = '';
                    that.time = 0;
                    clearInterval(timer);
                    timer = null;
                    that.hasTimerStarted = false;
                    if (that.currentRound < that.program.rounds) {
                        that.currentRound++;
                    }
                } else {
                    that.time++;
                }
                that.setTime();
            }, 1000);
        }
    }
    setTime() {
        $('#timer').removeClass();
        $('#timer').text(secsToTime(this.time));
        $('#timer').addClass(this.timerState);
        $('#round').text(`Round ${this.currentRound}`);
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