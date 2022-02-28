$(document).ready(function () {
    /*if (jQuery.cookie('sv_timer') === null){
        var inputs = '<label>Timer</label><br><input type="text" size="20" value="03:30">' +
                                 '<label>Overtime</label><br><input type="text" size="20" value="01:30">'
        promptDialog("Mat and overtime have not been assigned", "1", function(data){
            jQuery.cookie('sv_timer', durationToSeconds(data[0]));
            jQuery.cookie('sv_overtimer', svOvertimer=durationToSeconds(data[1]));
        }, inputs);
    }*/

//	var timerOffset = $('#sv_timer').offset();
//	$('#floatingRectangle').css({top: timerOffset.top, left: timerOffset.left, position:'absolute'});
    $('#tie_break').css('visibility', 'hidden');
    if (window.location.host.indexOf(':8080') > -1) {
        var sv_assign_mat = jQuery.cookie('sv_assign_mat') || '1';
        var event_number = svCurrentEvent || '';
        jQueryAjax(init, null, 'action=getScoreboardEvent&mat=' + sv_assign_mat + '&event_number=' + event_number);
    } else {
        init(null);
    }

    fillDiv($('#Clockface'));

    $( window ).resize(function() {
        fillDiv($('#Clockface'));
    });
});

function fillDiv(div) {
    const ratio = $(window).height() / div.height();
    if (ratio <= 1) {
        div.css('transform', `scale(${ratio})`);
    } else {
        div.css('transform', `scale(1)`);
    }
}

function jQueryAjax(processFunc, funcParams, urlparameters) {
    var jsonId = new Date().getTime();
    jQuery.getJSON('/json?' + urlparameters,
        {JSON_ID: jsonId},
        function (data) {
            processFunc(data.retdata, funcParams);
        });
}

Number.prototype.pad = function (size) {
    var s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }
    return s;
}

var RightClick = {
    'sensitivity': 350,
    'count': 0,
    'timer': false,
    'active': function () {
        this.count++;
        this.timer = setTimeout(
            this.endCountdown.bind(this),
            this.sensitivity
        );
    },
    'endCountdown': function () {
        this.count = 0;
        this.timer = false;
    }
};

function disableSelection(target) {
    if (typeof target.onselectstart != "undefined") //For IE
        target.onselectstart = function () {
            return false
        }
    else if (typeof target.style.MozUserSelect != "undefined") //For Firefox
        target.style.MozUserSelect = "none"
    else //All other route (For Opera)
        target.onmousedown = function () {
            return false
        }
    target.style.cursor = "default"
}

var tenSecBell = new Audio("10_secs_warning.mp3");
var thirtySecBell = new Audio("30_secs_warning.mp3");

class SVTimer {
    time = 0;
    isOvertime = false;
    hasTimerStarted = false;
    overtimeLimit = 120000;
    isUnlimitedTime = false;

    constructor() {
        this.hasTimerStarted = false;
    }
    startTimer() {
        this.hasTimerStarted = true;
        var that = this;
        this.timer = setInterval(function () {
            if (that.isUnlimitedTime) {
                that.time = that.time + 100;
                that.setTime(that.time);
            } else if (that.isOvertime) {
                if (that.time === 0) {
                    const currentPlayer = $('.overtime_box.current_round');
                    const round = $(currentPlayer).attr('round');
                    $(currentPlayer).find('.label').text('X');
                    $(currentPlayer).addClass('filled');
                    var nextPlayer = $(`.overtime_box[round="${round}"]:not(.current_round)`);

                    if ($(nextPlayer).find('.label').text() !== 'X') {
                        that.resetTimer(true)
                    } else {
                        that.isUnlimitedTime = true;
                        that.resetTimer(false);
                    }
                    that.moveToNextPlayer();

                    endBell.play();
                } else {
                    if (that.time === 10000) {
                        tenSecBell.play();
                    } else if (that.time === 30000) {
                        thirtySecBell.play();
                    }
                    that.time = that.time - 100;
                    that.setTime(that.time);
                }
            } else {
                if (that.time === 0) {
                    endBell.play();
                    that.resetTimer(false);
                    if ($('#sv_minus1').html() === $('#sv_minus2').html()) {
                        that.startOvertime();
                    } else {
                        var player1Score = parseInt($('#sv_minus1').html());
                        var player2Score = parseInt($('#sv_minus2').html());
                        if (player1Score > player2Score) {
                            $('.player1-winner').show();
                            $('.player2-winner').hide();
                        } else {
                            $('.player2-winner').show();
                            $('.player1-winner').hide();
                        }
                    }
                    that.hasTimerStarted = false;
                } else {
                    that.time = that.time - 100;
                    that.setTime(that.time);
                }
            }
        }, 100);
    }
    moveToNextPlayer() {
        var currentPlayer = $('.overtime_box.current_round');
        var currentRound = currentPlayer.attr('round');
        var nextPlayer = $(`.overtime_box[round="${currentRound}"]:not(.current_round)`);
        if (nextPlayer.hasClass('filled')) {
            nextPlayer = nextPlayer.next('.overtime_box');
        }

        nextPlayer.addClass('current_round');
        currentPlayer.removeClass('current_round');
        currentPlayer.removeClass('started');

        if (this.isUnlimitedTime) {
            if (nextPlayer.find('.label').text() === 'X') {
                nextPlayer.find('.label').text('');
                nextPlayer.removeClass('filled');
                this.resetTimer(false);
            } else {
                this.isUnlimitedTime = false;
                this.resetTimer(true);
            }
        } else {
            this.resetTimer(true);
        }
    }
    resetTimer(isOvertime) {
        clearInterval(this.timer);
        this.timer = null;
        this.hasTimerStarted = false;
        if (isOvertime) {
            this.isOvertime = isOvertime;
            this.setTimer(this.overtimeLimit);
            this.time = this.overtimeLimit;
            this.setTime(this.overtimeLimit);
        } else {
            this.setTimer(0);
            this.setTime(0);
        }
    }
    pauseTimer() {
        clearInterval(this.timer);
        this.timer = null;
        this.hasTimerStarted = false;
    }
    addTime(amount) {
        this.time += amount;
        this.setTime(this.time);
    }
    setTime(milliseconds) {
        $('#sv_timer').css('color', !this.isOvertime ? '#fe0000' : 'yellow');
        $('#sv_timer').html(millisecondsToTime(milliseconds));
    }
    startOvertime() {
        $('#tie_break').css('visibility', 'visible');
        this.isOvertime = true;
        this.setTimer(this.overtimeLimit);
        $('#sv_timer').css('color', 'yellow');
        $('#overtime_section ').css('visibility', 'visible');
    }
    setTimer(time) {
        this.time = time;
    }
    resetFlags() {
        this.isOvertime = false;
        this.hasTimerStarted = false;
        this.isUnlimitedTime = false;
    }
}

var svTimerInit = '00:00';
// var svOvertimer = 24 * 60 * 60;
var svTimer = new SVTimer();

function init(data) {
    disableSelection(document.body);
    $(document).bind("contextmenu", function () {
        return false
    });

    if (jQuery.cookie('sv_clock') !== null) {
        svTimerInit = jQuery.cookie('sv_clock');
        svTimer.time = timeToMilliseconds(svTimerInit);
    }

    setNextEvent(data);

    $('#sv_timer').html(svTimerInit);
    $('#sv_score1').html('00');
    $('#sv_score2').html('00');
    $('#sv_minus1').html('0');
    $('#sv_minus2').html('0');

    $('#sv_reg1').click(enterRegs);
    $('#sv_reg2').click(enterRegs);
    $('#sv_timer').dblclick(function (ev) {
        svTimer.addTime(10000);
    });
    $('#sv_timer').click(function () {
        toggleTimer();
    });
    // $('#sv_timer').mousedown(function (ev) {
    //     if (ev.which === 3) {
    //         svTimer.addTime(-1);
    //     } else {
    //         toggleTimer();
    //     }
    // });

    $('#sv_score1').mousedown(function (ev) {
        if (ev.which === 3) {
            shift_key_down = true;
        }
        addScore(1);
        shift_key_down = false;
    });
    $('#sv_score2').mousedown(function (ev) {
        if (ev.which === 3) {
            shift_key_down = true;
        }
        addScore(2);
        shift_key_down = false;
    });
    $('#sv_minus1').mousedown(function (ev) {
        if (ev.which === 3) {
            shift_key_down = true;
        }
        penaltyScore(1);
        shift_key_down = false;
    });
    $('#sv_minus2').mousedown(function (ev) {
        if (ev.which === 3) {
            shift_key_down = true;
        }
        penaltyScore(2);
        shift_key_down = false;
    });

    $('.overtime_box').click(function (e) {
        if (!$(this).hasClass('started') && !svTimer.hasTimerStarted) {
            $('.current_round').removeClass('current_round');
            $(this).addClass('current_round');
            $(this).addClass('started');
            $(this).find('.label').text('');
            $(this).find('.time').text('');
            $(this).removeClass('filled');

            const currentRound = $(this).attr('round');
            $(`.overtime_box[round="${currentRound}"]`).removeClass('winner').removeClass('loser');
            $('.winner-label').hide();

            svTimer.startTimer();
        } else {
            if ($(this).hasClass('started')) {
                $(this).removeClass('started');
                enterOvertimeScores(e);
            }
        }
    });

    function keydown(e) {
        if (e.keyCode === 16)
            shift_key_down = true;
    }

    function keyup(e) {
        if (e.keyCode === 16)
            shift_key_down = false;
        else
            process('keyup', e);
    }

    function keypress(e) {
    }

    if (document.addEventListener) {
        document.addEventListener("keydown", keydown, false);
        document.addEventListener("keypress", keypress, false);
        document.addEventListener("keyup", keyup, false);
    } else if (document.attachEvent) {
        document.attachEvent("onkeydown", keydown);
        document.attachEvent("onkeypress", keypress);
        document.attachEvent("onkeyup", keyup);
    } else {
        document.onkeydown = keydown;
        document.onkeypress = keypress;
        document.onkeyup = keyup;
    }

}

var shift_key_down = false;

function pauseAll(force) {
    if (force !== undefined) {
        svTimer.pauseTimer();
    }

    return $('#sv_comp1').length > 0;
}

function process(w, e) {
    console.log(w + e.keyCode + '\n');

    if (pauseAll())
        return;

    switch (e.keyCode) {
        case 32: //space
            toggleTimer();
            break;
        case 90: //z
            addScore(1);
            break;
        case 77: //m
            addScore(2);
            break;
        case 65: //a
            penaltyScore(1);
            break;
        case 75: //k
            penaltyScore(2);
            break;
        case 82: //r
            enterRegs(2);
            break;
        case 71: //g
            getNextMatch();
            break;
    }
}

var svCurrentEvent = null;

function getNextMatch() {
    if (window.location.host.indexOf(':8080') > -1)
        jQueryAjax(setNextEvent, null, 'action=getScoreboardEvent&mat=' + jQuery.cookie('sv_assign_mat') + '&event_number=' + ((svCurrentEvent !== null) ? svCurrentEvent.event_number : ''));
}

function setNextEvent(data) {
    svCurrentEvent = data;
    if (data != null) {
        try {
            var regs = data.match.split(' vs ');
            $('#sv_reg1').html(regs[0]);
            $('#sv_reg2').html(regs[1]);
            setFlags(data.sv_reg1_country, data.sv_reg2_country);
            resetScore();
        } catch (e) {
            jAlert("Error loading from server.");
        }
    }
}

function promptDialog(msg, def, callback, html) {
    pauseAll(true);
    if (html == undefined) {
        html = '<div id="sv_dialog" title="' + msg + '">' +
            '<input type="text" size="20" value="' + def + '">' +
            '</div>';
    } else {
        html = '<div id="sv_dialog" title="' + msg + '">' +
            html +
            '</div>';
    }
    $('body').append(html);

    function openDialog() {
        $("#sv_dialog").dialog({
            modal: true,
            buttons: {
                "OK": function () {
                    var inputVals = $.map($('#sv_dialog input'), function (input) {
                        return $(input).val();
                    });
                    callback(inputVals.length > 1 ? inputVals : inputVals.pop());
                    $("#sv_dialog").dialog('close');
                },
            },
            close: function () {
                $('#sv_dialog').remove();
            }
        });
    }

    openDialog();
}

function setFlags(sv_reg1_country, sv_reg2_country) {
    sv_reg1_country = COUNTRIES.find(function (c) {
        return c.country_code === sv_reg1_country
    });
    sv_reg2_country = COUNTRIES.find(function (c) {
        return c.country_code === sv_reg2_country
    });
    $('#competitor1_flag_img').attr('src', `assets/${sv_reg1_country.image}`);
    $('#competitor2_flag_img').attr('src', `assets/${sv_reg2_country.image}`);
    $('#competitor1_flag_name').attr('country_code', sv_reg1_country.country_code).html(sv_reg1_country.name + ' (' + sv_reg1_country.country_code_3 + ')');
    $('#competitor2_flag_name').attr('country_code', sv_reg2_country.country_code).html(sv_reg2_country.name + ' (' + sv_reg2_country.country_code_3 + ')');
}

function enterRegs() {
    pauseAll(true);
    var mat = jQuery.cookie('sv_assign_mat');
    if (mat === null)
        mat = '1';

    function getCountries(country_code) {
        return $.map(COUNTRIES, function (country) {
            var option = $('<option>').val(country.country_code).html(country.name);
            if (country.country_code === (country_code ? country_code : 'US'))
                option.attr('selected', 'selected');
            return option[0].outerHTML;
        }).join('\n');
    }

    function getTimerClock(value) {
        value = value || '03:30';
        var timers = ['01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
        return $.map(timers, function (timer) {
            var option = $('<option>').html(timer);
            if (timer === value)
                option.attr('selected', 'selected');
            return option[0].outerHTML;
        }).join('\n');
    }

    function getOverTimer(value) {
        value = value || '00:00';
        var timers = ['00:00', '00:15', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
        var options = $.map(timers, function (timer) {
            var option = $('<option>').html(timer);
            if (timer === value)
                option.attr('selected', 'selected');
            return option[0].outerHTML;
        }).join('\n');
        return options;
    }

    var d = '<div id="sv_dialog" title="Enter Competitors">' +
        '<table>' +
        '<tr><td style=" color: white;" nowrap>Mat Number</td><td><input type="text" id="sv_assign_mat" size="20" value="' + mat + '"></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Competitor 1</td><td><input type="text" id="sv_comp1" size="20" value="' + $('#sv_reg1').html() + '"></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Competitor 1 Country</td><td><select id="sv_comp1_country" value="US">' + getCountries($('#competitor1_flag_name').attr('country_code')) + '</select></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Competitor 2</td><td><input type="text" id="sv_comp2" size="20" value="' + $('#sv_reg2').html() + '"></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Competitor 2 Country</td><td><select id="sv_comp2_country" value="US">' + getCountries($('#competitor2_flag_name').attr('country_code')) + '</select></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Timer</td><td><select id="sv_clock">' + getTimerClock($('#sv_timer').html()) + '</select></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Overtimer</td><td><select id="sv_overtimer">' + getOverTimer('02:00') + '</select></td></tr>' +
        '<tr><td style=" color: white;" nowrap>Semifinals/Finals</td><td><input id="sv_finals" type="checkbox" /></td></tr>' +
        '</table>' +
        '</div>';
    $('body').append(d);

    if($('#overtime_section').hasClass('is-finals')) {
        $('#sv_finals').attr('checked', 'checked');
    }

    function openDialog() {
        $('#sv_clock').val(svTimerInit);
        $('#sv_overtimer').val(millisecondsToTime(svTimer.overtimeLimit));
        $("#sv_dialog").dialog({
            modal: true,
            width: 'auto',
            buttons: {
                "Reset Score": resetScore,
                "OK": function () {
                    $('#sv_reg1').html($('#sv_comp1').val());
                    $('#sv_reg2').html($('#sv_comp2').val());
                    setFlags($('select#sv_comp1_country').val(), $('select#sv_comp2_country').val());

                    // set time
                    var timer = $('#sv_clock').val();
                    if (timer) {
                        svTimer.time = 0;
                        svTimer.addTime(timeToMilliseconds(timer));
                        jQuery.cookie('sv_clock', timer);
                    }

                    // set overtime
                    var overtimer = $('#sv_overtimer').val();
                    if (overtimer) {
                        svTimer.overtimeLimit = timeToMilliseconds(overtimer);
                        if(svTimer.isOvertime) {
                            svTimer.startOvertime();
                        }
                    }

                    var isFinals = $('#sv_finals:checked');
                    if (isFinals && isFinals.length > 0) {
                        $('#overtime_section').addClass('is-finals');
                    } else {
                        $('#overtime_section').removeClass('is-finals');
                    }


                    jQuery.cookie('sv_assign_mat', $('#sv_assign_mat').val());
                    $("#sv_dialog").dialog('close');
                },
            },
            close: function () {
                $('#sv_dialog').remove();
            }
        });
    }

    openDialog();
}

var overtimeScores = initOvertimeScores();

function enterOvertimeScores(e) {
    svTimer.pauseTimer();
    const overtime_box = e.currentTarget;
    var dialog = `<div id="sv_overtime_dialog">
        <button class="sv_overtime_button" id="SUB">SUB</button>
        <button class="sv_overtime_button" id="SCP">SCP</button>
        <button class="sv_overtime_button" id="TAP">TAP</button>
    </div>`;
    $('body').append(dialog);

    $('.sv_overtime_button').click(function() {
        const currentOvertimeBox = $(overtime_box);
        const currentRound = currentOvertimeBox.attr('round');
        const currentPlayer = currentOvertimeBox.attr('player');

        var activeButton = $(this);
        currentOvertimeBox.children('.label').text(activeButton.text());
        overtimeScores[`round${currentRound}`][currentPlayer].type = activeButton.text();

        var isFilled = currentOvertimeBox.hasClass('filled');
        if (!isFilled) {
            if (svTimer.isUnlimitedTime) {
                currentOvertimeBox.children('.time').text(millisecondsToTimeWithMs(svTimer.time));
                overtimeScores[`round${currentRound}`][currentPlayer].time = svTimer.time;
            } else {
                currentOvertimeBox.children('.time').text(millisecondsToTimeWithMs(svTimer.overtimeLimit - svTimer.time));
                overtimeScores[`round${currentRound}`][currentPlayer].time = svTimer.overtimeLimit - svTimer.time;
            }
            currentOvertimeBox.addClass('filled');
        }

        svTimer.moveToNextPlayer();

        const isFinals = $('#overtime_section').hasClass('is-finals');
        // if both players of the current round are filled, eval score
        if ($(`.overtime_box[round="${currentRound}"].filled`).length === 2) {
            const player1 = $(`.overtime_box[round="${currentRound}"][player="player1"]`);
            const player2 = $(`.overtime_box[round="${currentRound}"][player="player2"]`);
             setRoundWinner(currentRound, player1, player2);
            if (isFinals && $('.winner-label:not(:visible)').length === 2) {
                player1.next().addClass('current_round');
            }
        }

        $("#sv_overtime_dialog").dialog('close');
    });

    function getOverallWinner() {
        $('.player1-winner').hide();
        $('.player2-winner').hide();
        var isFinals = $('#overtime_section').hasClass('is-finals');
        var round1Winner = overtimeScores.round1.winner;
        var round2Winner = overtimeScores.round2.winner;
        var round3Winner = overtimeScores.round3.winner;
        if (!isFinals) {
            if (round1Winner === 'player1') {
                $('.player1-winner').show();
            } else if (round1Winner === 'player2') {
                $('.player2-winner').show();
            }
        } else {
            if (round1Winner === 'player1' && round2Winner === 'player1') {
                $('.player1-winner').show();
            } else if (round1Winner === 'player2' && round2Winner === 'player2') {
                $('.player2-winner').show();
            } else if (round3Winner === 'player1') {
                $('.player1-winner').show();
            } else if (round3Winner === 'player2') {
                $('.player2-winner').show();
            }
        }
    }

    function setRoundWinner(currentRound, player1, player2) {
        var currentRoundWinner = getRoundWinner(currentRound);
        overtimeScores[`round${currentRound}`].winner = currentRoundWinner;
        if(currentRoundWinner === 'player1') {
            player1.addClass('winner');
            player2.addClass('loser');
        } else if(currentRoundWinner === 'player2') {
            player1.addClass('loser');
            player2.addClass('winner')
        } else {
            player1.removeClass('winner').removeClass('loser');
            player2.removeClass('winner').removeClass('loser');
        }
        getOverallWinner();
    }

    function getRoundWinner(round) {
        var player1 = overtimeScores[`round${round}`].player1;
        var player2 = overtimeScores[`round${round}`].player2;

        if (player1.type === 'SUB') {
            if (player2.type === 'SCP' || player2.type === 'TAP') {
                return 'player1';
            }
            if (player2.type === 'SUB'){
                if (player1.time < player2.time) {
                    return 'player1';
                } else if (player1.time > player2.time) {
                    return 'player2';
                }
            }
        }
        if (player1.type === 'SCP') {
           if (player2.type === 'TAP') {
               return 'player1';
           }
           if (player2.type === 'SUB') {
               return 'player2';
           }
           if (player2.type === 'SCP') {
               if (player1.time < player2.time) {
                   return 'player1';
               } else if (player1.time > player2.time) {
                   return 'player2';
               }
           }
        }
        if (player1.type === 'TAP') {
            if (player2.type === 'TAP') {
                if (player1.time > player2.time) {
                    return 'player1';
                } else if (player1.time < player2.time) {
                    return 'player2';
                }
            }
            if (player2.type === 'SCP') {
                return 'player2';
            }
            if(player2.type === 'SUB'){
                return 'player2';
            }
        }

        if (player1.type === '') {
            return 'player2';
        }

        if (player2.type === '') {
            return 'player1';
        }

        return null;
    }

    function openOvertimeScoreDialog() {
        $("#sv_overtime_dialog").dialog({
            modal: true,
            width: 'auto',
            buttons: {
                "Reset": function () {
                    var currentOvertimeBox = $(overtime_box);
                    var currentPlayer = currentOvertimeBox.attr('player');
                    var currentRound = currentOvertimeBox.attr('round');

                    currentOvertimeBox.children('.label').text('');
                    currentOvertimeBox.children('.time').text('');
                    currentOvertimeBox.removeClass('filled');
                    currentOvertimeBox.removeClass('current_round');

                    overtimeScores[`round${currentRound}`].winner = '';
                    overtimeScores[`round${currentRound}`][currentPlayer] = {
                        type: '',
                        time: 0,
                    };

                    $('.winner-label').hide();
                },
            },
            close: function () {
                $('#sv_overtime_dialog').remove();
            }
        });
    }

    openOvertimeScoreDialog();
}

function initOvertimeScores() {
    return {
        // currentRound: 1,
        round1: {
            player1: {
                type: '',
                time: 0,
            },
            player2: {
                type: '',
                time: 0,
            },
            winner: '',
        },
        round2: {
            player1: {
                type: '',
                time: 0,
            },
            player2: {
                type: '',
                time: 0,
            },
            winner: '',
        },
        round3: {
            player1: {
                type: '',
                time: 0,
            },
            player2: {
                type: '',
                time: 0,
            },
            winner: '',
        }
    }
}

function resetScore() {
    $('#sv_minus1').html('0');
    $('#sv_minus2').html('0');

    setPenaltyLight('right', '');
    setPenaltyLight('left', '');

    svTimer.resetTimer(false);
    svTimer.resetFlags();

    $('.overtime_box').children('.label').text('');
    $('.overtime_box').children('.time').text('');
    $('.overtime_box').removeClass('filled');
    $('.overtime_box').removeClass('winner');
    $('.overtime_box').removeClass('loser');
    $('.overtime_box').removeClass('current_round');
    overtimeScores = initOvertimeScores();

    $('#overtime_section').css('visibility', 'hidden');

    $('.winner-label').hide();

    $('#tie_break').css('visibility', 'hidden');

}

function setPenaltyLight(side, color) {
    var ilist = $('img[src^=' + side + '-circles]');
    for (var i = 0; i < ilist.length; i++) {
        $(ilist[i]).css('visibility', 'hidden');
    }
    if (color !== '') {
        $('img[src="' + side + '-circles-' + color + '.png"]').css('visibility', 'visible');
    }
}

function penaltyScore(index) {
    var showNeg = true;
    if (typeof sv_showPenaltyNegativeSign !== 'undefined') {
        showNeg = sv_showPenaltyNegativeSign;
    }
    var id = '#sv_minus' + index;
    var s = parseInt((!showNeg ? '-' : '') + $(id).html()) - (shift_key_down ? -1 : 1);
    if (s > -4 && s <= 0) {
        if (!showNeg) {
            s = -s;
        }
        $(id).html(s);
    }

    if ($('img[src="left-circles-orange.png"]').length === 0)
        return;

    var side = 'left';
    if (index > 1)
        side = 'right';

    s = Math.abs(parseInt($(id).html()));
    if (s <= 0) {
        setPenaltyLight(side, '');
    } else if (s === 1) {
        setPenaltyLight(side, 'yellow');
    } else if (s === 2) {
        setPenaltyLight(side, 'orange');
    } else {
        setPenaltyLight(side, 'red');
        pauseAll(true);
        endBell.play();
    }
}

function addScore(index) {
    console.log(shift_key_down);
    var id = '#sv_score' + index;
    var s = parseInt($(id).html()) + (shift_key_down ? -1 : 1);
    if (s >= 0 && s < 100)
        $(id).html(s.pad(2));
}

var endBell = new Audio("bell.wav");

function toggleTimer() {
    if (!svTimer.hasTimerStarted && !svTimer.isOvertime) {
        svTimer.startTimer();
    } else {
        svTimer.pauseTimer();
    }
}

function secondsToDuration(seconds) {
    var min = seconds / 60;
    return (min < 10 ? '0' + min : min) + ':' + (seconds % 60);
}

function durationToSeconds(duration) {
    try {
        var t = duration.split(':');
        return parseInt(t[0]) * 60 + parseInt(t[1]);
    } catch (e) {

    }
}

function millisecondsToTimeWithMs(duration) {
    var milliseconds = parseInt((duration%1000).toFixed(3))
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)
        , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds + "." + milliseconds;
}

function millisecondsToTime(s) {
    // Pad to 2 or 3 digits, default is 2
    function pad(n, z) {
        z = z || 2;
        return ('00' + n).slice(-z);
    }

    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    var time = pad(mins) + ':' + pad(secs);

    return time;
}

function timeToMilliseconds(time) {
    var a = time.split(':'); // split it at the colons

    var seconds = (+a[0]) * 60 + (+a[1]);
    return seconds * 1000;
}

function getPositionById(Id) {
    var elem_absoulte_position = $("#" + Id).offset();
    return {top: elem_absoulte_position.top, left: elem_absoulte_position.left};
}

var COUNTRIES = [
    {image: '0230_aruba.png', name: 'ABW Aruba', country_code: 'AW', country_code_3: 'ABW'},
    {image: '0241_afghanistan.png', name: 'AFG Afghanistan', country_code: 'AF', country_code_3: 'AFG'},
    {image: '0236_angola.png', name: 'AGO Angola', country_code: 'AO', country_code_3: 'AGO'},
    {image: '0235_anguilla.png', name: 'AIA Anguilla', country_code: 'AI', country_code_3: 'AIA'},
    {image: 'no_image', name: 'ALA Aland Islands', country_code: 'AX', country_code_3: 'ALA'},
    {image: '0240_albania.png', name: 'ALB Albania', country_code: 'AL', country_code_3: 'ALB'},
    {image: '0237_andorra.png', name: 'AND Andorra', country_code: 'AD', country_code_3: 'AND'},
    {
        image: '0088_netherlands antilles.png',
        name: 'ANT Netherlands Antilles',
        country_code: 'AN',
        country_code_3: 'ANT'
    },
    {image: '0012_uae.png', name: 'ARE United Arab Emirates', country_code: 'AE', country_code_3: 'ARE'},
    {image: '0232_argentina.png', name: 'ARG Argentina', country_code: 'AR', country_code_3: 'ARG'},
    {image: '0231_armenia.png', name: 'ARM Armenia', country_code: 'AM', country_code_3: 'ARM'},
    {image: '0238_american samoa.png', name: 'ASM American Samoa', country_code: 'AS', country_code_3: 'ASM'},
    {image: '0234_antarctica.png', name: 'ATA Antarctica', country_code: 'AQ', country_code_3: 'ATA'},
    {
        image: '0164_French Southern Territories.png',
        name: 'ATF French Southern Territories',
        country_code: 'TF',
        country_code_3: 'ATF'
    },
    {
        image: '0233_antigua and barbuda.png',
        name: 'ATG Antigua and Barbuda',
        country_code: 'AG',
        country_code_3: 'ATG'
    },
    {image: '0228_austria.png', name: 'AUS Australia', country_code: 'AU', country_code_3: 'AUS'},
    {image: '0229_autralia.png', name: 'AUT Austria', country_code: 'AT', country_code_3: 'AUT'},
    {image: '0227_Azerbaijan, Republic of.png', name: 'AZE Azerbaijan', country_code: 'AZ', country_code_3: 'AZE'},
    {image: '0205_burundi.png', name: 'BDI Burundi', country_code: 'BI', country_code_3: 'BDI'},
    {image: '0221_belgium.png', name: 'BEL Belgium', country_code: 'BE', country_code_3: 'BEL'},
    {image: '0219_benin.png', name: 'BEN Benin', country_code: 'BJ', country_code_3: 'BEN'},
    {image: '0206_burkina.png', name: 'BFA Burkina Faso', country_code: 'BF', country_code_3: 'BFA'},
    {image: '0224_bangladesh.png', name: 'BGD Bangladesh', country_code: 'BD', country_code_3: 'BGD'},
    {image: '0207_BULGARIA.png', name: 'BGR Bulgaria', country_code: 'BG', country_code_3: 'BGR'},
    {image: '0225_Bahrain.png', name: 'BHR Bahrain', country_code: 'BH', country_code_3: 'BHR'},
    {image: '0226_bahamas.png', name: 'BHS Bahamas', country_code: 'BS', country_code_3: 'BHS'},
    {
        image: '0214_Bosnia and Herzegovina.png',
        name: 'BIH Bosnia and Herzegovina',
        country_code: 'BA',
        country_code_3: 'BIH'
    },
    {image: '0060_saint barthelemy.png', name: 'BLM Saint-Barthélemy', country_code: 'BL', country_code_3: 'BLM'},
    {image: '0222_belarus.png', name: 'BLR Belarus', country_code: 'BY', country_code_3: 'BLR'},
    {image: '0220_belize.png', name: 'BLZ Belize', country_code: 'BZ', country_code_3: 'BLZ'},
    {image: '0218_bermuda.png', name: 'BMU Bermuda', country_code: 'BM', country_code_3: 'BMU'},
    {image: '0216_bolivia.png', name: 'BOL Bolivia', country_code: 'BO', country_code_3: 'BOL'},
    {image: '0212_brazil.png', name: 'BRA Brazil', country_code: 'BR', country_code_3: 'BRA'},
    {image: '0223_barbados.png', name: 'BRB Barbados', country_code: 'BB', country_code_3: 'BRB'},
    {image: '0208_BRUNEI.png', name: 'BRN Brunei Darussalam', country_code: 'BN', country_code_3: 'BRN'},
    {image: '0217_bhutan.png', name: 'BTN Bhutan', country_code: 'BT', country_code_3: 'BTN'},
    {
        image: '0211_Bouvet Island (Bouvetoya).png',
        name: 'BVT Bouvet Island',
        country_code: 'BV',
        country_code_3: 'BVT'
    },
    {image: '0213_Botswana.png', name: 'BWA Botswana', country_code: 'BW', country_code_3: 'BWA'},
    {
        image: '0199_central africa.png',
        name: 'CAF Central African Republic',
        country_code: 'CF',
        country_code_3: 'CAF'
    },
    {image: '0202_canada.png', name: 'CAN Canada', country_code: 'CA', country_code_3: 'CAN'},
    {image: '0194_cocos .png', name: 'CCK Cocos (Keeling) Islands', country_code: 'CC', country_code_3: 'CCK'},
    {image: '0031_switzerland.png', name: 'CHE Switzerland', country_code: 'CH', country_code_3: 'CHE'},
    {image: '0197_chile.png', name: 'CHL Chile', country_code: 'CL', country_code_3: 'CHL'},
    {image: '0196_china.png', name: 'CHN China', country_code: 'CN', country_code_3: 'CHN'},
    {image: '0188_cote.png', name: 'CIV Côte d\'Ivoire', country_code: 'CI', country_code_3: 'CIV'},
    {image: '0204_camboja.png', name: 'CMR Cameroon', country_code: 'CM', country_code_3: 'CMR'},
    {image: 'DRC_lgflag.png', name: 'COD Congo, (Kinshasa)', country_code: 'CD', country_code_3: 'COD'},
    {image: '0191_congo.png', name: 'COG Congo (Brazzaville)', country_code: 'CG', country_code_3: 'COG'},
    {image: '0190_cook.png', name: 'COK Cook Islands', country_code: 'CK', country_code_3: 'COK'},
    {image: '0193_colombia.png', name: 'COL Colombia', country_code: 'CO', country_code_3: 'COL'},
    {image: '0192_comoros.png', name: 'COM Comoros', country_code: 'KM', country_code_3: 'COM'},
    {image: '0201_cape verde.png', name: 'CPV Cape Verde', country_code: 'CV', country_code_3: 'CPV'},
    {image: '0189_costa rica.png', name: 'CRI Costa Rica', country_code: 'CR', country_code_3: 'CRI'},
    {image: '0186_cuba.png', name: 'CUB Cuba', country_code: 'CU', country_code_3: 'CUB'},
    {image: '0185_Curaçao.png', name: 'CUW Curacao', country_code: 'CW', country_code_3: 'CUW'},
    {image: '0195_chrismas.png', name: 'CXR Christmas Island', country_code: 'CX', country_code_3: 'CXR'},
    {image: '0200_cayman.png', name: 'CYM Cayman Islands', country_code: 'KY', country_code_3: 'CYM'},
    {image: '0184_cyprus.png', name: 'CYP Cyprus', country_code: 'CY', country_code_3: 'CYP'},
    {image: '0183_czech_republic.png', name: 'CZE Czech Republic', country_code: 'CZ', country_code_3: 'CZE'},
    {image: '0160_germany.png', name: 'DEU Germany', country_code: 'DE', country_code_3: 'DEU'},
    {image: '0181_djibouti.png', name: 'DJI Djibouti', country_code: 'DJ', country_code_3: 'DJI'},
    {image: '0180_dominica.png', name: 'DMA Dominica', country_code: 'DM', country_code_3: 'DMA'},
    {image: '0182_denmark.png', name: 'DNK Denmark', country_code: 'DK', country_code_3: 'DNK'},
    {image: '0179_dominican.png', name: 'DOM Dominican Republic', country_code: 'DO', country_code_3: 'DOM'},
    {image: '0239_algeria.png', name: 'DZA Algeria', country_code: 'DZ', country_code_3: 'DZA'},
    {image: '0178_ecuador.png', name: 'ECU Ecuador', country_code: 'EC', country_code_3: 'ECU'},
    {image: '0177_egypt.png', name: 'EGY Egypt', country_code: 'EG', country_code_3: 'EGY'},
    {image: '0174_eritrea.png', name: 'ERI Eritrea', country_code: 'ER', country_code_3: 'ERI'},
    {image: '0003_western sahara.png', name: 'ESH Western Sahara', country_code: 'EH', country_code_3: 'ESH'},
    {image: '0037_spain.png', name: 'ESP Spain', country_code: 'ES', country_code_3: 'ESP'},
    {image: '0173_Estonia.png', name: 'EST Estonia', country_code: 'EE', country_code_3: 'EST'},
    {image: '0172_ethiopia.png', name: 'ETH Ethiopia', country_code: 'ET', country_code_3: 'ETH'},
    {image: '0168_filand.png', name: 'FIN Finland', country_code: 'FI', country_code_3: 'FIN'},
    {image: '0169_fiji.png', name: 'FJI Fiji', country_code: 'FJ', country_code_3: 'FJI'},
    {image: '0171_falkland.png', name: 'FLK Falkland Islands (Malvinas)', country_code: 'FK', country_code_3: 'FLK'},
    {image: '0167_france.png', name: 'FRA France', country_code: 'FR', country_code_3: 'FRA'},
    {image: '0170_faroe.png', name: 'FRO Faroe Islands', country_code: 'FO', country_code_3: 'FRO'},
    {
        image: '0100_micronesia.png',
        name: 'FSM Micronesia, Federated States of',
        country_code: 'FM',
        country_code_3: 'FSM'
    },
    {image: '0163_Gabon.png', name: 'GAB Gabon', country_code: 'GA', country_code_3: 'GAB'},
    {image: '0011_uk.png', name: 'GBR United Kingdom', country_code: 'GB', country_code_3: 'GBR'},
    {image: '0161_Georgia.png', name: 'GEO Georgia', country_code: 'GE', country_code_3: 'GEO'},
    {image: '0151_guernsey.png', name: 'GGY Guernsey', country_code: 'GG', country_code_3: 'GGY'},
    {image: '0159_ghana.png', name: 'GHA Ghana', country_code: 'GH', country_code_3: 'GHA'},
    {image: '0158_gibraltar.png', name: 'GIB Gibraltar', country_code: 'GI', country_code_3: 'GIB'},
    {image: '0150_guinea-bissau.png', name: 'GIN Guinea', country_code: 'GN', country_code_3: 'GIN'},
    {image: '0154_Guadeloupe.png', name: 'GLP Guadeloupe', country_code: 'GP', country_code_3: 'GLP'},
    {image: '0162_Gambia.png', name: 'GMB Gambia', country_code: 'GM', country_code_3: 'GMB'},
    {image: 'Guinea-Bissau_lgflag.gif', name: 'GNB Guinea-Bissau', country_code: 'GW', country_code_3: 'GNB'},
    {image: '0175_Equatorial Guinea.png', name: 'GNQ Equatorial Guinea', country_code: 'GQ', country_code_3: 'GNQ'},
    {image: '0157_greece.png', name: 'GRC Greece', country_code: 'GR', country_code_3: 'GRC'},
    {image: '0155_grenada.png', name: 'GRD Grenada', country_code: 'GD', country_code_3: 'GRD'},
    {image: '0156_greeland.png', name: 'GRL Greenland', country_code: 'GL', country_code_3: 'GRL'},
    {image: '0152_guatemala.png', name: 'GTM Guatemala', country_code: 'GT', country_code_3: 'GTM'},
    {image: '0166_French Guiana.png', name: 'GUF French Guiana', country_code: 'GF', country_code_3: 'GUF'},
    {image: '0153_guam.png', name: 'GUM Guam', country_code: 'GU', country_code_3: 'GUM'},
    {image: 'Guyana_lgflag.gif', name: 'GUY Guyana', country_code: 'GY', country_code_3: 'GUY'},
    {image: '0145_hong kong.png', name: 'HKG Hong Kong', country_code: 'HK', country_code_3: 'HKG'},
    {image: 'hong_kong_flag.gif', name: 'HKG Hong Kong, SAR China', country_code: 'HK', country_code_3: 'HKG'},
    {
        image: '0148_Heard Island and McDonald Islands.png',
        name: 'HMD Heard and Mcdonald Islands',
        country_code: 'HM',
        country_code_3: 'HMD'
    },
    {image: '0146_honduras.png', name: 'HND Honduras', country_code: 'HN', country_code_3: 'HND'},
    {
        image: '0147_holy see.png',
        name: 'HNDVAT Holy See (Vatican City State)',
        country_code: 'VA',
        country_code_3: 'VAT'
    },
    {image: '0187_croatia.png', name: 'HRV Croatia', country_code: 'HR', country_code_3: 'HRV'},
    {image: '0149_haiti.png', name: 'HTI Haiti', country_code: 'HT', country_code_3: 'HTI'},
    {image: '0144_hungary.png', name: 'HUN Hungary', country_code: 'HU', country_code_3: 'HUN'},
    {image: '0141_indonesia.png', name: 'IDN Indonesia', country_code: 'ID', country_code_3: 'IDN'},
    {image: '0137_ilse of man.png', name: 'IMN Isle of Man', country_code: 'IM', country_code_3: 'IMN'},
    {image: '0142_india.png', name: 'IND India', country_code: 'IN', country_code_3: 'IND'},
    {
        image: '0209_British Virgin Islands.png',
        name: 'IOT British Indian Ocean Territory',
        country_code: 'IO',
        country_code_3: 'IOT'
    },
    {image: '0138_irland.png', name: 'IRL Ireland', country_code: 'IE', country_code_3: 'IRL'},
    {image: '0140_iran.png', name: 'IRN Iran, Islamic Republic of', country_code: 'IR', country_code_3: 'IRN'},
    {image: '0139_iraq.png', name: 'IRQ Iraq', country_code: 'IQ', country_code_3: 'IRQ'},
    {image: '0143_iceland.png', name: 'ISL Iceland', country_code: 'IS', country_code_3: 'ISL'},
    {image: '0136_israel.png', name: 'ISR Israel', country_code: 'IL', country_code_3: 'ISR'},
    {image: '0135_italy.png', name: 'ITA Italy', country_code: 'IT', country_code_3: 'ITA'},
    {image: '0134_jamaica.png', name: 'JAM Jamaica', country_code: 'JM', country_code_3: 'JAM'},
    {image: '0132_jersey.png', name: 'JEY Jersey', country_code: 'JE', country_code_3: 'JEY'},
    {image: '0131_jordan.png', name: 'JOR Jordan', country_code: 'JO', country_code_3: 'JOR'},
    {image: '0133_japan.png', name: 'JPN Japan', country_code: 'JP', country_code_3: 'JPN'},
    {image: '0130_kazackstan.png', name: 'KAZ Kazakhstan', country_code: 'KZ', country_code_3: 'KAZ'},
    {image: '0129_kenya.png', name: 'KEN Kenya', country_code: 'KE', country_code_3: 'KEN'},
    {image: '0124_kyrgyzstan.png', name: 'KGZ Kyrgyzstan', country_code: 'KG', country_code_3: 'KGZ'},
    {image: '0203_camaroon.png', name: 'KHM Cambodia', country_code: 'KH', country_code_3: 'KHM'},
    {image: '0128_kiribati.png', name: 'KIR Kiribati', country_code: 'KI', country_code_3: 'KIR'},
    {image: '0058_saint kitts.png', name: 'KNA Saint Kitts and Nevis', country_code: 'KN', country_code_3: 'KNA'},
    {image: '0126_korei sul.png', name: 'KOR Korea (South)', country_code: 'KR', country_code_3: 'KOR'},
    {image: '0125_kwait.png', name: 'KWT Kuwait', country_code: 'KW', country_code_3: 'KWT'},
    {image: '0123_laos.png', name: 'LAO Lao PDR', country_code: 'LA', country_code_3: 'LAO'},
    {image: '0121_lebanon.png', name: 'LBN Lebanon', country_code: 'LB', country_code_3: 'LBN'},
    {image: '0119_liberia.png', name: 'LBR Liberia', country_code: 'LR', country_code_3: 'LBR'},
    {image: '0118_lybia.png', name: 'LBY Libya', country_code: 'LY', country_code_3: 'LBY'},
    {image: '0057_saint lucia.png', name: 'LCA Saint Lucia', country_code: 'LC', country_code_3: 'LCA'},
    {image: '0117_liechtenstein.png', name: 'LIE Liechtenstein', country_code: 'LI', country_code_3: 'LIE'},
    {image: '0036_sri lanka.png', name: 'LKA Sri Lanka', country_code: 'LK', country_code_3: 'LKA'},
    {image: '0120_lesotho.png', name: 'LSO Lesotho', country_code: 'LS', country_code_3: 'LSO'},
    {image: '0116_lithuania.png', name: 'LTU Lithuania', country_code: 'LT', country_code_3: 'LTU'},
    {image: '0115_luxembourg.png', name: 'LUX Luxembourg', country_code: 'LU', country_code_3: ''},
    {image: '0122_latvia.png', name: 'LVA Latvia', country_code: 'LV', country_code_3: 'LVA'},
    {image: 'Macau_lgflag.gif', name: 'MAC Macao, SAR China', country_code: 'MO', country_code_3: 'MAC'},
    {
        image: '0056_saint martin.png',
        name: 'MAF Saint-Martin (French part)',
        country_code: 'MF',
        country_code_3: 'MAF'
    },
    {image: '0094_morocco.png', name: 'MAR Morocco', country_code: 'MA', country_code_3: 'MAR'},
    {image: '0098_monaco.png', name: 'MCO Monaco', country_code: 'MC', country_code_3: 'MCO'},
    {image: '0099_moldova.png', name: 'MDA Moldova', country_code: 'MD', country_code_3: 'MDA'},
    {image: '0112_madagascar.png', name: 'MDG Madagascar', country_code: 'MG', country_code_3: 'MDG'},
    {image: '0109_maldives.png', name: 'MDV Maldives', country_code: 'MV', country_code_3: 'MDV'},
    {image: '0101_mexico.png', name: 'MEX Mexico', country_code: 'MX', country_code_3: 'MEX'},
    {image: '0106_marshall.png', name: 'MHL Marshall Islands', country_code: 'MH', country_code_3: 'MHL'},
    {image: '0107_malta.png', name: 'MHLMLT Malta', country_code: 'MT', country_code_3: 'MLT'},
    {image: '0113_macedonia.png', name: 'MKD Macedonia, Republic of', country_code: 'MK', country_code_3: 'MKD'},
    {image: '0108_mali.png', name: 'MLI Mali', country_code: 'ML', country_code_3: 'MLI'},
    {image: '0092_maynmar.png', name: 'MMR Myanmar', country_code: 'MM', country_code_3: 'MMR'},
    {image: '0096_monstenegro.png', name: 'MNE Montenegro', country_code: 'ME', country_code_3: 'MNE'},
    {image: '0097_mongolia.png', name: 'MNG Mongolia', country_code: 'MN', country_code_3: 'MNG'},
    {
        image: 'Northern_Mariana_lgflag.gif',
        name: 'MNP Northern Mariana Islands',
        country_code: 'MP',
        country_code_3: 'MNP'
    },
    {image: '0093_mozambique.png', name: 'MOZ Mozambique', country_code: 'MZ', country_code_3: 'MOZ'},
    {image: '0104_mauritania.png', name: 'MRT Mauritania', country_code: 'MR', country_code_3: 'MRT'},
    {image: '0095_montserrat.png', name: 'MSR Montserrat', country_code: 'MS', country_code_3: 'MSR'},
    {image: '0105_martinique.png', name: 'MTQ Martinique', country_code: 'MQ', country_code_3: 'MTQ'},
    {image: '0103_mauritius.png', name: 'MUS Mauritius', country_code: 'MU', country_code_3: 'MUS'},
    {image: '0111_malawi.png', name: 'MWI Malawi', country_code: 'MW', country_code_3: 'MWI'},
    {image: '0110_malaysia.png', name: 'MYS Malaysia', country_code: 'MY', country_code_3: 'MYS'},
    {image: '0102_mayotte.png', name: 'MYT Mayotte', country_code: 'YT', country_code_3: 'MYT'},
    {image: '0091_namibia.png', name: 'NAM Namibia', country_code: 'NA', country_code_3: 'NAM'},
    {image: '0086_new caledonia.png', name: 'NCL New Caledonia', country_code: 'NC', country_code_3: 'NCL'},
    {image: '0083_niger.png', name: 'NER Niger', country_code: 'NE', country_code_3: 'NER'},
    {image: '0080_norfolk.png', name: 'NFK Norfolk Island', country_code: 'NF', country_code_3: 'NFK'},
    {image: '0082_nigeria.png', name: 'NGA Nigeria', country_code: 'NG', country_code_3: 'NGA'},
    {image: '0084_nicaragua.png', name: 'NIC Nicaragua', country_code: 'NI', country_code_3: 'NIC'},
    {image: '0081_niue.png', name: 'NIU Niue', country_code: 'NU', country_code_3: 'NIU'},
    {image: '0087_netherlands.png', name: 'NLD Netherlands', country_code: 'NL', country_code_3: 'NLD'},
    {image: '0078_norway.png', name: 'NOR Norway', country_code: 'NO', country_code_3: 'NOR'},
    {image: '0089_nepal.png', name: 'NPL Nepal', country_code: 'NP', country_code_3: 'NPL'},
    {image: '0090_nauru.png', name: 'NRU Nauru', country_code: 'NR', country_code_3: 'NRU'},
    {image: '0085_new zealand.png', name: 'NZL New Zealand', country_code: 'NZ', country_code_3: 'NZL'},
    {image: '0077_oman.png', name: 'OMN Oman', country_code: 'OM', country_code_3: 'OMN'},
    {image: '0076_pakistan.png', name: 'PAK Pakistan', country_code: 'PK', country_code_3: 'PAK'},
    {image: '0073_panama.png', name: 'PAN Panama', country_code: 'PA', country_code_3: 'PAN'},
    {image: 'Pitcairn_Islands_lgflag.gif', name: 'PCN Pitcairn', country_code: 'PN', country_code_3: 'PCN'},
    {image: '0070_peru.png', name: 'PER Peru', country_code: 'PE', country_code_3: 'PER'},
    {image: '0069_philippines.png', name: 'PHL Philippines', country_code: 'PH', country_code_3: 'PHL'},
    {image: '0075_palau.png', name: 'PLW Palau', country_code: 'PW', country_code_3: 'PLW'},
    {image: 'Papua_New_Guinea_lgflag.gif', name: 'PNG Papua New Guinea', country_code: 'PG', country_code_3: 'PNG'},
    {image: '0068_poland.png', name: 'POL Poland', country_code: 'PL', country_code_3: 'POL'},
    {image: '0066_puerto rico.png', name: 'PRI Puerto Rico', country_code: 'PR', country_code_3: 'PRI'},
    {image: '0127_korea north.png', name: 'PRK Korea (North)', country_code: 'KP', country_code_3: 'PRK'},
    {image: '0067_portugal.png', name: 'PRT Portugal', country_code: 'PT', country_code_3: 'PRT'},
    {image: '0071_paraguay.png', name: 'PRY Paraguay', country_code: 'PY', country_code_3: 'PRY'},
    {image: '0074_palestine.png', name: 'PSE Palestinian Territory', country_code: 'PS', country_code_3: 'PSE'},
    {image: '0165_French Polynesia.png', name: 'PYF French Polynesia', country_code: 'PF', country_code_3: 'PYF'},
    {image: '0065_qatar.png', name: 'QAT Qatar', country_code: 'QA', country_code_3: 'QAT'},
    {image: '0064_reunion.png', name: 'REU Réunion', country_code: 'RE', country_code_3: 'REU'},
    {image: '0063_romaria.png', name: 'ROU Romania', country_code: 'RO', country_code_3: 'ROU'},
    {image: '0062_russia.png', name: 'RUS Russian Federation', country_code: 'RU', country_code_3: 'RUS'},
    {image: '0061_rwanda.png', name: 'RWA Rwanda', country_code: 'RW', country_code_3: 'RWA'},
    {image: '0050_saudi arabia.png', name: 'SAU Saudi Arabia', country_code: 'SA', country_code_3: 'SAU'},
    {image: '0035_sudan.png', name: 'SDN Sudan', country_code: 'SD', country_code_3: 'SDN'},
    {image: '0049_senegal.png', name: 'SEN Senegal', country_code: 'SN', country_code_3: 'SEN'},
    {image: '0045_singapora.png', name: 'SGP Singapore', country_code: 'SG', country_code_3: 'SGP'},
    {
        image: '0038_south georgia.png',
        name: 'SGS South Georgia and the South Sandwich Islands',
        country_code: 'GS',
        country_code_3: 'SGS'
    },
    {image: '0059_saint helena.png', name: 'SHN Saint Helena', country_code: 'SH', country_code_3: 'SHN'},
    {image: 'svalbard.gif', name: 'SJM Svalbard and Jan Mayen Islands', country_code: 'SJ', country_code_3: 'SJM'},
    {image: '0040_somaliland.png', name: 'SLB Solomon Islands', country_code: 'SB', country_code_3: 'SLB'},
    {image: '0046_sierra leone.png', name: 'SLE Sierra Leone', country_code: 'SL', country_code_3: 'SLE'},
    {image: '0176_el savador.png', name: 'SLV El Salvador', country_code: 'SV', country_code_3: 'SLV'},
    {image: '0052_san marino.png', name: 'SMR San Marino', country_code: 'SM', country_code_3: 'SMR'},
    {image: '0041_somalia.png', name: 'SOM Somalia', country_code: 'SO', country_code_3: 'SOM'},
    {image: '0055_saint pierre.png', name: 'SPM Saint Pierre and Miquelon', country_code: 'PM', country_code_3: 'SPM'},
    {image: '0048_serbia.png', name: 'SRB Serbia', country_code: 'RS', country_code_3: 'SRB'},
    {image: 'south_sudan.png', name: 'SSD South Sudan', country_code: 'SS', country_code_3: 'SSD'},
    {image: '0051_sao tome.png', name: 'STP Sao Tome and Principe', country_code: 'ST', country_code_3: 'STP'},
    {image: '0033_suriname .png', name: 'SUR Suriname', country_code: 'SR', country_code_3: 'SUR'},
    {image: '0044_slovakia.png', name: 'SVK Slovakia', country_code: 'SK', country_code_3: 'SVK'},
    {image: '0043_slovenia.png', name: 'SVN Slovenia', country_code: 'SI', country_code_3: 'SVN'},
    {image: '0032_sweden.png', name: 'SWE Sweden', country_code: 'SE', country_code_3: 'SWE'},
    {image: '0034_swaziland.png', name: 'SWZ Swaziland', country_code: 'SZ', country_code_3: 'SWZ'},
    {image: '0047_seychelles.png', name: 'SYC Seychelles', country_code: 'SC', country_code_3: 'SYC'},
    {image: '0029_syrian.png', name: 'SYR Syrian Arab Republic (Syria)', country_code: 'SY', country_code_3: 'SYR'},
    {
        image: '0016_turk and caicos.png',
        name: 'TCA Turks and Caicos Islands',
        country_code: 'TC',
        country_code_3: 'TCA'
    },
    {image: '0198_chad.png', name: 'TCD Chad', country_code: 'TD', country_code_3: 'TCD'},
    {image: '0023_togo.png', name: 'TGO Togo', country_code: 'TG', country_code_3: 'TGO'},
    {image: '0025_thailand.png', name: 'THA Thailand', country_code: 'TH', country_code_3: 'THA'},
    {image: '0027_tajikistan.png', name: 'TJK Tajikistan', country_code: 'TJ', country_code_3: 'TJK'},
    {image: '0022_tokelau.png', name: 'TKL Tokelau', country_code: 'TK', country_code_3: 'TKL'},
    {image: '0017_turkmenistan.png', name: 'TKM Turkmenistan', country_code: 'TM', country_code_3: 'TKM'},
    {image: '0024_timor lest.png', name: 'TLS Timor-Leste', country_code: 'TL', country_code_3: 'TLS'},
    {image: '0021_tonga.png', name: 'TON Tonga', country_code: 'TO', country_code_3: 'TON'},
    {image: '0020_trinidad.png', name: 'TTO Trinidad and Tobago', country_code: 'TT', country_code_3: 'TTO'},
    {image: '0019_tunisia.png', name: 'TUN Tunisia', country_code: 'TN', country_code_3: 'TUN'},
    {image: '0018_turkey.png', name: 'TUR Turkey', country_code: 'TR', country_code_3: 'TUR'},
    {image: '0015_tuvalu.png', name: 'TUV Tuvalu', country_code: 'TV', country_code_3: 'TUV'},
    {image: '0028_taiwan.png', name: 'TWN Taiwan, Republic of China', country_code: 'TW', country_code_3: 'TWN'},
    {image: '0026_tanzania.png', name: 'TZA Tanzania, United Republic of', country_code: 'TZ', country_code_3: 'TZA'},
    {image: '0014_uganda.png', name: 'UGA Uganda', country_code: 'UG', country_code_3: 'UGA'},
    {image: '0013_ukraine.png', name: 'UKR Ukraine', country_code: 'UA', country_code_3: 'UKR'},
    {image: '0010_usa.png', name: 'UMI US Minor Outlying Islands', country_code: 'UM', country_code_3: 'UMI'},
    {image: '0009_uruguay.png', name: 'URY Uruguay', country_code: 'UY', country_code_3: 'URY'},
    {image: '0010_usa.png', name: 'USA United States', country_code: 'US', country_code_3: 'USA'},
    {image: '0008_uzbekistan.png', name: 'UZB Uzbekistan', country_code: 'UZ', country_code_3: 'UZB'},
    {
        image: '0054_saint vicent.png',
        name: 'VCT Saint Vincent and Grenadines',
        country_code: 'VC',
        country_code_3: 'VCT'
    },
    {
        image: '0006_venezuela.png',
        name: 'VEN Venezuela (Bolivarian Republic)',
        country_code: 'VE',
        country_code_3: 'VEN'
    },
    {
        image: '0210_British Indian Ocean Territory.png',
        name: 'VGB British Virgin Islands',
        country_code: 'VG',
        country_code_3: 'VGB'
    },
    {image: 'Virgin_Islands_lgflag.gif', name: 'VIR Virgin Islands, US', country_code: 'VI', country_code_3: 'VIR'},
    {image: '0005_vietinam.png', name: 'VNM Viet Nam', country_code: 'VN', country_code_3: 'VNM'},
    {image: '0007_vanatu.png', name: 'VUT Vanuatu', country_code: 'VU', country_code_3: 'VUT'},
    {image: '0004_wallis.png', name: 'WLF Wallis and Futuna Islands', country_code: 'WF', country_code_3: 'WLF'},
    {image: '0053_samoa.png', name: 'WSM Samoa', country_code: 'WS', country_code_3: 'WSM'},
    {image: '0002_yemen.png', name: 'YEM Yemen', country_code: 'YE', country_code_3: 'YEM'},
    {image: '0039_south africa.png', name: 'ZAF South Africa', country_code: 'ZA', country_code_3: 'ZAF'},
    {image: '0001_zambia.png', name: 'ZMB Zambia', country_code: 'ZM', country_code_3: ''},
    {image: '0000_zimbabue.png', name: 'ZWE Zimbabwe', country_code: 'ZW', country_code_3: 'ZWE'},
];

