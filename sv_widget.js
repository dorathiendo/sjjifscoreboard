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
    $('#tie_break').hide();
    if (window.location.host.indexOf(':8080') > -1) {
        var sv_assign_mat = jQuery.cookie('sv_assign_mat') || '1';
        var event_number = svCurrentEvent || '';
        jQueryAjax(init, null, 'action=getScoreboardEvent&mat=' + sv_assign_mat + '&event_number=' + event_number);
    } else {
        init(null);
    }
});

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
                that.time = that.time + 10;
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
                    that.time = that.time - 10;
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
                    that.time = that.time - 10;
                    that.setTime(that.time);
                }
            }
        }, 10);
    }
    moveToNextPlayer() {
        var currentPlayer = $('.overtime_box.current_round');
        var currentRound = currentPlayer.attr('round');
        var nextPlayer = $(`.overtime_box[round="${currentRound}"]:not(.current_round)`);

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
        $('#tie_break').show();
        this.isOvertime = true;
        this.setTimer(this.overtimeLimit);
        $('#sv_timer').css('color', 'yellow');
        $('#overtime_section .overtime_box_wrapper').css('visibility', 'visible');
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
    $('#competitor1_flag_img').attr('src', 'flags/' + sv_reg1_country.image);
    $('#competitor2_flag_img').attr('src', 'flags/' + sv_reg2_country.image);
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

    $('#overtime_section .overtime_box_wrapper').css('visibility', 'hidden');

    $('.winner-label').hide();

    $('#tie_break').hide();

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
    {image: '_0230_aruba.jpg', name: 'ABW Aruba', country_code: 'AW', country_code_3: 'ABW'},
    {image: '_0241_afghanistan.jpg', name: 'AFG Afghanistan', country_code: 'AF', country_code_3: 'AFG'},
    {image: '_0236_angola.jpg', name: 'AGO Angola', country_code: 'AO', country_code_3: 'AGO'},
    {image: '_0235_anguilla.jpg', name: 'AIA Anguilla', country_code: 'AI', country_code_3: 'AIA'},
    {image: 'no_image', name: 'ALA Aland Islands', country_code: 'AX', country_code_3: 'ALA'},
    {image: '_0240_albania.jpg', name: 'ALB Albania', country_code: 'AL', country_code_3: 'ALB'},
    {image: '_0237_andorra.jpg', name: 'AND Andorra', country_code: 'AD', country_code_3: 'AND'},
    {
        image: '_0088_netherlands antilles.jpg',
        name: 'ANT Netherlands Antilles',
        country_code: 'AN',
        country_code_3: 'ANT'
    },
    {image: '_0012_uae.jpg', name: 'ARE United Arab Emirates', country_code: 'AE', country_code_3: 'ARE'},
    {image: '_0232_argentina.jpg', name: 'ARG Argentina', country_code: 'AR', country_code_3: 'ARG'},
    {image: '_0231_armenia.jpg', name: 'ARM Armenia', country_code: 'AM', country_code_3: 'ARM'},
    {image: '_0238_american samoa.jpg', name: 'ASM American Samoa', country_code: 'AS', country_code_3: 'ASM'},
    {image: '_0234_antarctica.jpg', name: 'ATA Antarctica', country_code: 'AQ', country_code_3: 'ATA'},
    {
        image: '_0164_French Southern Territories.jpg',
        name: 'ATF French Southern Territories',
        country_code: 'TF',
        country_code_3: 'ATF'
    },
    {
        image: '_0233_antigua and barbuda.jpg',
        name: 'ATG Antigua and Barbuda',
        country_code: 'AG',
        country_code_3: 'ATG'
    },
    {image: '_0228_austria.jpg', name: 'AUS Australia', country_code: 'AU', country_code_3: 'AUS'},
    {image: '_0229_autralia.jpg', name: 'AUT Austria', country_code: 'AT', country_code_3: 'AUT'},
    {image: '_0227_Azerbaijan, Republic of.jpg', name: 'AZE Azerbaijan', country_code: 'AZ', country_code_3: 'AZE'},
    {image: '_0205_burundi.jpg', name: 'BDI Burundi', country_code: 'BI', country_code_3: 'BDI'},
    {image: '_0221_belgium.jpg', name: 'BEL Belgium', country_code: 'BE', country_code_3: 'BEL'},
    {image: '_0219_benin.jpg', name: 'BEN Benin', country_code: 'BJ', country_code_3: 'BEN'},
    {image: '_0206_burkina.jpg', name: 'BFA Burkina Faso', country_code: 'BF', country_code_3: 'BFA'},
    {image: '_0224_bangladesh.jpg', name: 'BGD Bangladesh', country_code: 'BD', country_code_3: 'BGD'},
    {image: '_0207_BULGARIA.jpg', name: 'BGR Bulgaria', country_code: 'BG', country_code_3: 'BGR'},
    {image: '_0225_Bahrain.jpg', name: 'BHR Bahrain', country_code: 'BH', country_code_3: 'BHR'},
    {image: '_0226_bahamas.jpg', name: 'BHS Bahamas', country_code: 'BS', country_code_3: 'BHS'},
    {
        image: '_0214_Bosnia and Herzegovina.jpg',
        name: 'BIH Bosnia and Herzegovina',
        country_code: 'BA',
        country_code_3: 'BIH'
    },
    {image: '_0060_saint barthelemy.jpg', name: 'BLM Saint-Barthélemy', country_code: 'BL', country_code_3: 'BLM'},
    {image: '_0222_belarus.jpg', name: 'BLR Belarus', country_code: 'BY', country_code_3: 'BLR'},
    {image: '_0220_belize.jpg', name: 'BLZ Belize', country_code: 'BZ', country_code_3: 'BLZ'},
    {image: '_0218_bermuda.jpg', name: 'BMU Bermuda', country_code: 'BM', country_code_3: 'BMU'},
    {image: '_0216_bolivia.jpg', name: 'BOL Bolivia', country_code: 'BO', country_code_3: 'BOL'},
    {image: '_0212_brazil.jpg', name: 'BRA Brazil', country_code: 'BR', country_code_3: 'BRA'},
    {image: '_0223_barbados.jpg', name: 'BRB Barbados', country_code: 'BB', country_code_3: 'BRB'},
    {image: '_0208_BRUNEI.jpg', name: 'BRN Brunei Darussalam', country_code: 'BN', country_code_3: 'BRN'},
    {image: '_0217_bhutan.jpg', name: 'BTN Bhutan', country_code: 'BT', country_code_3: 'BTN'},
    {
        image: '_0211_Bouvet Island (Bouvetoya).jpg',
        name: 'BVT Bouvet Island',
        country_code: 'BV',
        country_code_3: 'BVT'
    },
    {image: '_0213_Botswana.jpg', name: 'BWA Botswana', country_code: 'BW', country_code_3: 'BWA'},
    {
        image: '_0199_central africa.jpg',
        name: 'CAF Central African Republic',
        country_code: 'CF',
        country_code_3: 'CAF'
    },
    {image: '_0202_canada.jpg', name: 'CAN Canada', country_code: 'CA', country_code_3: 'CAN'},
    {image: '_0194_cocos .jpg', name: 'CCK Cocos (Keeling) Islands', country_code: 'CC', country_code_3: 'CCK'},
    {image: '_0031_switzerland.jpg', name: 'CHE Switzerland', country_code: 'CH', country_code_3: 'CHE'},
    {image: '_0197_chile.jpg', name: 'CHL Chile', country_code: 'CL', country_code_3: 'CHL'},
    {image: '_0196_china.jpg', name: 'CHN China', country_code: 'CN', country_code_3: 'CHN'},
    {image: '_0188_cote.jpg', name: 'CIV Côte d\'Ivoire', country_code: 'CI', country_code_3: 'CIV'},
    {image: '_0204_camboja.jpg', name: 'CMR Cameroon', country_code: 'CM', country_code_3: 'CMR'},
    {image: 'DRC_lgflag.jpg', name: 'COD Congo, (Kinshasa)', country_code: 'CD', country_code_3: 'COD'},
    {image: '_0191_congo.jpg', name: 'COG Congo (Brazzaville)', country_code: 'CG', country_code_3: 'COG'},
    {image: '_0190_cook.jpg', name: 'COK Cook Islands', country_code: 'CK', country_code_3: 'COK'},
    {image: '_0193_colombia.jpg', name: 'COL Colombia', country_code: 'CO', country_code_3: 'COL'},
    {image: '_0192_comoros.jpg', name: 'COM Comoros', country_code: 'KM', country_code_3: 'COM'},
    {image: '_0201_cape verde.jpg', name: 'CPV Cape Verde', country_code: 'CV', country_code_3: 'CPV'},
    {image: '_0189_costa rica.jpg', name: 'CRI Costa Rica', country_code: 'CR', country_code_3: 'CRI'},
    {image: '_0186_cuba.jpg', name: 'CUB Cuba', country_code: 'CU', country_code_3: 'CUB'},
    {image: '_0185_Curaçao.jpg', name: 'CUW Curacao', country_code: 'CW', country_code_3: 'CUW'},
    {image: '_0195_chrismas.jpg', name: 'CXR Christmas Island', country_code: 'CX', country_code_3: 'CXR'},
    {image: '_0200_cayman.jpg', name: 'CYM Cayman Islands', country_code: 'KY', country_code_3: 'CYM'},
    {image: '_0184_cyprus.jpg', name: 'CYP Cyprus', country_code: 'CY', country_code_3: 'CYP'},
    {image: '_0183_czech_republic.jpg', name: 'CZE Czech Republic', country_code: 'CZ', country_code_3: 'CZE'},
    {image: '_0160_germany.jpg', name: 'DEU Germany', country_code: 'DE', country_code_3: 'DEU'},
    {image: '_0181_djibouti.jpg', name: 'DJI Djibouti', country_code: 'DJ', country_code_3: 'DJI'},
    {image: '_0180_dominica.jpg', name: 'DMA Dominica', country_code: 'DM', country_code_3: 'DMA'},
    {image: '_0182_denmark.jpg', name: 'DNK Denmark', country_code: 'DK', country_code_3: 'DNK'},
    {image: '_0179_dominican.jpg', name: 'DOM Dominican Republic', country_code: 'DO', country_code_3: 'DOM'},
    {image: '_0239_algeria.jpg', name: 'DZA Algeria', country_code: 'DZ', country_code_3: 'DZA'},
    {image: '_0178_ecuador.jpg', name: 'ECU Ecuador', country_code: 'EC', country_code_3: 'ECU'},
    {image: '_0177_egypt.jpg', name: 'EGY Egypt', country_code: 'EG', country_code_3: 'EGY'},
    {image: '_0174_eritrea.jpg', name: 'ERI Eritrea', country_code: 'ER', country_code_3: 'ERI'},
    {image: '_0003_western sahara.jpg', name: 'ESH Western Sahara', country_code: 'EH', country_code_3: 'ESH'},
    {image: '_0037_spain.jpg', name: 'ESP Spain', country_code: 'ES', country_code_3: 'ESP'},
    {image: '_0173_Estonia.jpg', name: 'EST Estonia', country_code: 'EE', country_code_3: 'EST'},
    {image: '_0172_ethiopia.jpg', name: 'ETH Ethiopia', country_code: 'ET', country_code_3: 'ETH'},
    {image: '_0168_filand.jpg', name: 'FIN Finland', country_code: 'FI', country_code_3: 'FIN'},
    {image: '_0169_fiji.jpg', name: 'FJI Fiji', country_code: 'FJ', country_code_3: 'FJI'},
    {image: '_0171_falkland.jpg', name: 'FLK Falkland Islands (Malvinas)', country_code: 'FK', country_code_3: 'FLK'},
    {image: '_0167_france.jpg', name: 'FRA France', country_code: 'FR', country_code_3: 'FRA'},
    {image: '_0170_faroe.jpg', name: 'FRO Faroe Islands', country_code: 'FO', country_code_3: 'FRO'},
    {
        image: '_0100_micronesia.jpg',
        name: 'FSM Micronesia, Federated States of',
        country_code: 'FM',
        country_code_3: 'FSM'
    },
    {image: '_0163_Gabon.jpg', name: 'GAB Gabon', country_code: 'GA', country_code_3: 'GAB'},
    {image: '_0011_uk.jpg', name: 'GBR United Kingdom', country_code: 'GB', country_code_3: 'GBR'},
    {image: '_0161_Georgia.jpg', name: 'GEO Georgia', country_code: 'GE', country_code_3: 'GEO'},
    {image: '_0151_guernsey.jpg', name: 'GGY Guernsey', country_code: 'GG', country_code_3: 'GGY'},
    {image: '_0159_ghana.jpg', name: 'GHA Ghana', country_code: 'GH', country_code_3: 'GHA'},
    {image: '_0158_gibraltar.jpg', name: 'GIB Gibraltar', country_code: 'GI', country_code_3: 'GIB'},
    {image: '_0150_guinea-bissau.jpg', name: 'GIN Guinea', country_code: 'GN', country_code_3: 'GIN'},
    {image: '_0154_Guadeloupe.jpg', name: 'GLP Guadeloupe', country_code: 'GP', country_code_3: 'GLP'},
    {image: '_0162_Gambia.jpg', name: 'GMB Gambia', country_code: 'GM', country_code_3: 'GMB'},
    {image: 'Guinea-Bissau_lgflag.gif', name: 'GNB Guinea-Bissau', country_code: 'GW', country_code_3: 'GNB'},
    {image: '_0175_Equatorial Guinea.jpg', name: 'GNQ Equatorial Guinea', country_code: 'GQ', country_code_3: 'GNQ'},
    {image: '_0157_greece.jpg', name: 'GRC Greece', country_code: 'GR', country_code_3: 'GRC'},
    {image: '_0155_grenada.jpg', name: 'GRD Grenada', country_code: 'GD', country_code_3: 'GRD'},
    {image: '_0156_greeland.jpg', name: 'GRL Greenland', country_code: 'GL', country_code_3: 'GRL'},
    {image: '_0152_guatemala.jpg', name: 'GTM Guatemala', country_code: 'GT', country_code_3: 'GTM'},
    {image: '_0166_French Guiana.jpg', name: 'GUF French Guiana', country_code: 'GF', country_code_3: 'GUF'},
    {image: '_0153_guam.jpg', name: 'GUM Guam', country_code: 'GU', country_code_3: 'GUM'},
    {image: 'Guyana_lgflag.gif', name: 'GUY Guyana', country_code: 'GY', country_code_3: 'GUY'},
    {image: '_0145_hong kong.jpg', name: 'HKG Hong Kong', country_code: 'HK', country_code_3: 'HKG'},
    {image: 'hong_kong_flag.gif', name: 'HKG Hong Kong, SAR China', country_code: 'HK', country_code_3: 'HKG'},
    {
        image: '_0148_Heard Island and McDonald Islands.jpg',
        name: 'HMD Heard and Mcdonald Islands',
        country_code: 'HM',
        country_code_3: 'HMD'
    },
    {image: '_0146_honduras.jpg', name: 'HND Honduras', country_code: 'HN', country_code_3: 'HND'},
    {
        image: '_0147_holy see.jpg',
        name: 'HNDVAT Holy See (Vatican City State)',
        country_code: 'VA',
        country_code_3: 'VAT'
    },
    {image: '_0187_croatia.jpg', name: 'HRV Croatia', country_code: 'HR', country_code_3: 'HRV'},
    {image: '_0149_haiti.jpg', name: 'HTI Haiti', country_code: 'HT', country_code_3: 'HTI'},
    {image: '_0144_hungary.jpg', name: 'HUN Hungary', country_code: 'HU', country_code_3: 'HUN'},
    {image: '_0141_indonesia.jpg', name: 'IDN Indonesia', country_code: 'ID', country_code_3: 'IDN'},
    {image: '_0137_ilse of man.jpg', name: 'IMN Isle of Man', country_code: 'IM', country_code_3: 'IMN'},
    {image: '_0142_india.jpg', name: 'IND India', country_code: 'IN', country_code_3: 'IND'},
    {
        image: '_0209_British Virgin Islands.jpg',
        name: 'IOT British Indian Ocean Territory',
        country_code: 'IO',
        country_code_3: 'IOT'
    },
    {image: '_0138_irland.jpg', name: 'IRL Ireland', country_code: 'IE', country_code_3: 'IRL'},
    {image: '_0140_iran.jpg', name: 'IRN Iran, Islamic Republic of', country_code: 'IR', country_code_3: 'IRN'},
    {image: '_0139_iraq.jpg', name: 'IRQ Iraq', country_code: 'IQ', country_code_3: 'IRQ'},
    {image: '_0143_iceland.jpg', name: 'ISL Iceland', country_code: 'IS', country_code_3: 'ISL'},
    {image: '_0136_israel.jpg', name: 'ISR Israel', country_code: 'IL', country_code_3: 'ISR'},
    {image: '_0135_italy.jpg', name: 'ITA Italy', country_code: 'IT', country_code_3: 'ITA'},
    {image: '_0134_jamaica.jpg', name: 'JAM Jamaica', country_code: 'JM', country_code_3: 'JAM'},
    {image: '_0132_jersey.jpg', name: 'JEY Jersey', country_code: 'JE', country_code_3: 'JEY'},
    {image: '_0131_jordan.jpg', name: 'JOR Jordan', country_code: 'JO', country_code_3: 'JOR'},
    {image: '_0133_japan.jpg', name: 'JPN Japan', country_code: 'JP', country_code_3: 'JPN'},
    {image: '_0130_kazackstan.jpg', name: 'KAZ Kazakhstan', country_code: 'KZ', country_code_3: 'KAZ'},
    {image: '_0129_kenya.jpg', name: 'KEN Kenya', country_code: 'KE', country_code_3: 'KEN'},
    {image: '_0124_kyrgyzstan.jpg', name: 'KGZ Kyrgyzstan', country_code: 'KG', country_code_3: 'KGZ'},
    {image: '_0203_camaroon.jpg', name: 'KHM Cambodia', country_code: 'KH', country_code_3: 'KHM'},
    {image: '_0128_kiribati.jpg', name: 'KIR Kiribati', country_code: 'KI', country_code_3: 'KIR'},
    {image: '_0058_saint kitts.jpg', name: 'KNA Saint Kitts and Nevis', country_code: 'KN', country_code_3: 'KNA'},
    {image: '_0126_korei sul.jpg', name: 'KOR Korea (South)', country_code: 'KR', country_code_3: 'KOR'},
    {image: '_0125_kwait.jpg', name: 'KWT Kuwait', country_code: 'KW', country_code_3: 'KWT'},
    {image: '_0123_laos.jpg', name: 'LAO Lao PDR', country_code: 'LA', country_code_3: 'LAO'},
    {image: '_0121_lebanon.jpg', name: 'LBN Lebanon', country_code: 'LB', country_code_3: 'LBN'},
    {image: '_0119_liberia.jpg', name: 'LBR Liberia', country_code: 'LR', country_code_3: 'LBR'},
    {image: '_0118_lybia.jpg', name: 'LBY Libya', country_code: 'LY', country_code_3: 'LBY'},
    {image: '_0057_saint lucia.jpg', name: 'LCA Saint Lucia', country_code: 'LC', country_code_3: 'LCA'},
    {image: '_0117_liechtenstein.jpg', name: 'LIE Liechtenstein', country_code: 'LI', country_code_3: 'LIE'},
    {image: '_0036_sri lanka.jpg', name: 'LKA Sri Lanka', country_code: 'LK', country_code_3: 'LKA'},
    {image: '_0120_lesotho.jpg', name: 'LSO Lesotho', country_code: 'LS', country_code_3: 'LSO'},
    {image: '_0116_lithuania.jpg', name: 'LTU Lithuania', country_code: 'LT', country_code_3: 'LTU'},
    {image: '_0115_luxembourg.jpg', name: 'LUX Luxembourg', country_code: 'LU', country_code_3: ''},
    {image: '_0122_latvia.jpg', name: 'LVA Latvia', country_code: 'LV', country_code_3: 'LVA'},
    {image: 'Macau_lgflag.gif', name: 'MAC Macao, SAR China', country_code: 'MO', country_code_3: 'MAC'},
    {
        image: '_0056_saint martin.jpg',
        name: 'MAF Saint-Martin (French part)',
        country_code: 'MF',
        country_code_3: 'MAF'
    },
    {image: '_0094_morocco.jpg', name: 'MAR Morocco', country_code: 'MA', country_code_3: 'MAR'},
    {image: '_0098_monaco.jpg', name: 'MCO Monaco', country_code: 'MC', country_code_3: 'MCO'},
    {image: '_0099_moldova.jpg', name: 'MDA Moldova', country_code: 'MD', country_code_3: 'MDA'},
    {image: '_0112_madagascar.jpg', name: 'MDG Madagascar', country_code: 'MG', country_code_3: 'MDG'},
    {image: '_0109_maldives.jpg', name: 'MDV Maldives', country_code: 'MV', country_code_3: 'MDV'},
    {image: '_0101_mexico.jpg', name: 'MEX Mexico', country_code: 'MX', country_code_3: 'MEX'},
    {image: '_0106_marshall.jpg', name: 'MHL Marshall Islands', country_code: 'MH', country_code_3: 'MHL'},
    {image: '_0107_malta.jpg', name: 'MHLMLT Malta', country_code: 'MT', country_code_3: 'MLT'},
    {image: '_0113_macedonia.jpg', name: 'MKD Macedonia, Republic of', country_code: 'MK', country_code_3: 'MKD'},
    {image: '_0108_mali.jpg', name: 'MLI Mali', country_code: 'ML', country_code_3: 'MLI'},
    {image: '_0092_maynmar.jpg', name: 'MMR Myanmar', country_code: 'MM', country_code_3: 'MMR'},
    {image: '_0096_monstenegro.jpg', name: 'MNE Montenegro', country_code: 'ME', country_code_3: 'MNE'},
    {image: '_0097_mongolia.jpg', name: 'MNG Mongolia', country_code: 'MN', country_code_3: 'MNG'},
    {
        image: 'Northern_Mariana_lgflag.gif',
        name: 'MNP Northern Mariana Islands',
        country_code: 'MP',
        country_code_3: 'MNP'
    },
    {image: '_0093_mozambique.jpg', name: 'MOZ Mozambique', country_code: 'MZ', country_code_3: 'MOZ'},
    {image: '_0104_mauritania.jpg', name: 'MRT Mauritania', country_code: 'MR', country_code_3: 'MRT'},
    {image: '_0095_montserrat.jpg', name: 'MSR Montserrat', country_code: 'MS', country_code_3: 'MSR'},
    {image: '_0105_martinique.jpg', name: 'MTQ Martinique', country_code: 'MQ', country_code_3: 'MTQ'},
    {image: '_0103_mauritius.jpg', name: 'MUS Mauritius', country_code: 'MU', country_code_3: 'MUS'},
    {image: '_0111_malawi.jpg', name: 'MWI Malawi', country_code: 'MW', country_code_3: 'MWI'},
    {image: '_0110_malaysia.jpg', name: 'MYS Malaysia', country_code: 'MY', country_code_3: 'MYS'},
    {image: '_0102_mayotte.jpg', name: 'MYT Mayotte', country_code: 'YT', country_code_3: 'MYT'},
    {image: '_0091_namibia.jpg', name: 'NAM Namibia', country_code: 'NA', country_code_3: 'NAM'},
    {image: '_0086_new caledonia.jpg', name: 'NCL New Caledonia', country_code: 'NC', country_code_3: 'NCL'},
    {image: '_0083_niger.jpg', name: 'NER Niger', country_code: 'NE', country_code_3: 'NER'},
    {image: '_0080_norfolk.jpg', name: 'NFK Norfolk Island', country_code: 'NF', country_code_3: 'NFK'},
    {image: '_0082_nigeria.jpg', name: 'NGA Nigeria', country_code: 'NG', country_code_3: 'NGA'},
    {image: '_0084_nicaragua.jpg', name: 'NIC Nicaragua', country_code: 'NI', country_code_3: 'NIC'},
    {image: '_0081_niue.jpg', name: 'NIU Niue', country_code: 'NU', country_code_3: 'NIU'},
    {image: '_0087_netherlands.jpg', name: 'NLD Netherlands', country_code: 'NL', country_code_3: 'NLD'},
    {image: '_0078_norway.jpg', name: 'NOR Norway', country_code: 'NO', country_code_3: 'NOR'},
    {image: '_0089_nepal.jpg', name: 'NPL Nepal', country_code: 'NP', country_code_3: 'NPL'},
    {image: '_0090_nauru.jpg', name: 'NRU Nauru', country_code: 'NR', country_code_3: 'NRU'},
    {image: '_0085_new zealand.jpg', name: 'NZL New Zealand', country_code: 'NZ', country_code_3: 'NZL'},
    {image: '_0077_oman.jpg', name: 'OMN Oman', country_code: 'OM', country_code_3: 'OMN'},
    {image: '_0076_pakistan.jpg', name: 'PAK Pakistan', country_code: 'PK', country_code_3: 'PAK'},
    {image: '_0073_panama.jpg', name: 'PAN Panama', country_code: 'PA', country_code_3: 'PAN'},
    {image: 'Pitcairn_Islands_lgflag.gif', name: 'PCN Pitcairn', country_code: 'PN', country_code_3: 'PCN'},
    {image: '_0070_peru.jpg', name: 'PER Peru', country_code: 'PE', country_code_3: 'PER'},
    {image: '_0069_philippines.jpg', name: 'PHL Philippines', country_code: 'PH', country_code_3: 'PHL'},
    {image: '_0075_palau.jpg', name: 'PLW Palau', country_code: 'PW', country_code_3: 'PLW'},
    {image: 'Papua_New_Guinea_lgflag.gif', name: 'PNG Papua New Guinea', country_code: 'PG', country_code_3: 'PNG'},
    {image: '_0068_poland.jpg', name: 'POL Poland', country_code: 'PL', country_code_3: 'POL'},
    {image: '_0066_puerto rico.jpg', name: 'PRI Puerto Rico', country_code: 'PR', country_code_3: 'PRI'},
    {image: '_0127_korea north.jpg', name: 'PRK Korea (North)', country_code: 'KP', country_code_3: 'PRK'},
    {image: '_0067_portugal.jpg', name: 'PRT Portugal', country_code: 'PT', country_code_3: 'PRT'},
    {image: '_0071_paraguay.jpg', name: 'PRY Paraguay', country_code: 'PY', country_code_3: 'PRY'},
    {image: '_0074_palestine.jpg', name: 'PSE Palestinian Territory', country_code: 'PS', country_code_3: 'PSE'},
    {image: '_0165_French Polynesia.jpg', name: 'PYF French Polynesia', country_code: 'PF', country_code_3: 'PYF'},
    {image: '_0065_qatar.jpg', name: 'QAT Qatar', country_code: 'QA', country_code_3: 'QAT'},
    {image: '_0064_reunion.jpg', name: 'REU Réunion', country_code: 'RE', country_code_3: 'REU'},
    {image: '_0063_romaria.jpg', name: 'ROU Romania', country_code: 'RO', country_code_3: 'ROU'},
    {image: '_0062_russia.jpg', name: 'RUS Russian Federation', country_code: 'RU', country_code_3: 'RUS'},
    {image: '_0061_rwanda.jpg', name: 'RWA Rwanda', country_code: 'RW', country_code_3: 'RWA'},
    {image: '_0050_saudi arabia.jpg', name: 'SAU Saudi Arabia', country_code: 'SA', country_code_3: 'SAU'},
    {image: '_0035_sudan.jpg', name: 'SDN Sudan', country_code: 'SD', country_code_3: 'SDN'},
    {image: '_0049_senegal.jpg', name: 'SEN Senegal', country_code: 'SN', country_code_3: 'SEN'},
    {image: '_0045_singapora.jpg', name: 'SGP Singapore', country_code: 'SG', country_code_3: 'SGP'},
    {
        image: '_0038_south georgia.jpg',
        name: 'SGS South Georgia and the South Sandwich Islands',
        country_code: 'GS',
        country_code_3: 'SGS'
    },
    {image: '_0059_saint helena.jpg', name: 'SHN Saint Helena', country_code: 'SH', country_code_3: 'SHN'},
    {image: 'svalbard.gif', name: 'SJM Svalbard and Jan Mayen Islands', country_code: 'SJ', country_code_3: 'SJM'},
    {image: '_0040_somaliland.jpg', name: 'SLB Solomon Islands', country_code: 'SB', country_code_3: 'SLB'},
    {image: '_0046_sierra leone.jpg', name: 'SLE Sierra Leone', country_code: 'SL', country_code_3: 'SLE'},
    {image: '_0176_el savador.jpg', name: 'SLV El Salvador', country_code: 'SV', country_code_3: 'SLV'},
    {image: '_0052_san marino.jpg', name: 'SMR San Marino', country_code: 'SM', country_code_3: 'SMR'},
    {image: '_0041_somalia.jpg', name: 'SOM Somalia', country_code: 'SO', country_code_3: 'SOM'},
    {image: '_0055_saint pierre.jpg', name: 'SPM Saint Pierre and Miquelon', country_code: 'PM', country_code_3: 'SPM'},
    {image: '_0048_serbia.jpg', name: 'SRB Serbia', country_code: 'RS', country_code_3: 'SRB'},
    {image: 'south_sudan.png', name: 'SSD South Sudan', country_code: 'SS', country_code_3: 'SSD'},
    {image: '_0051_sao tome.jpg', name: 'STP Sao Tome and Principe', country_code: 'ST', country_code_3: 'STP'},
    {image: '_0033_suriname .jpg', name: 'SUR Suriname', country_code: 'SR', country_code_3: 'SUR'},
    {image: '_0044_slovakia.jpg', name: 'SVK Slovakia', country_code: 'SK', country_code_3: 'SVK'},
    {image: '_0043_slovenia.jpg', name: 'SVN Slovenia', country_code: 'SI', country_code_3: 'SVN'},
    {image: '_0032_sweden.jpg', name: 'SWE Sweden', country_code: 'SE', country_code_3: 'SWE'},
    {image: '_0034_swaziland.jpg', name: 'SWZ Swaziland', country_code: 'SZ', country_code_3: 'SWZ'},
    {image: '_0047_seychelles.jpg', name: 'SYC Seychelles', country_code: 'SC', country_code_3: 'SYC'},
    {image: '_0029_syrian.jpg', name: 'SYR Syrian Arab Republic (Syria)', country_code: 'SY', country_code_3: 'SYR'},
    {
        image: '_0016_turk and caicos.jpg',
        name: 'TCA Turks and Caicos Islands',
        country_code: 'TC',
        country_code_3: 'TCA'
    },
    {image: '_0198_chad.jpg', name: 'TCD Chad', country_code: 'TD', country_code_3: 'TCD'},
    {image: '_0023_togo.jpg', name: 'TGO Togo', country_code: 'TG', country_code_3: 'TGO'},
    {image: '_0025_thailand.jpg', name: 'THA Thailand', country_code: 'TH', country_code_3: 'THA'},
    {image: '_0027_tajikistan.jpg', name: 'TJK Tajikistan', country_code: 'TJ', country_code_3: 'TJK'},
    {image: '_0022_tokelau.jpg', name: 'TKL Tokelau', country_code: 'TK', country_code_3: 'TKL'},
    {image: '_0017_turkmenistan.jpg', name: 'TKM Turkmenistan', country_code: 'TM', country_code_3: 'TKM'},
    {image: '_0024_timor lest.jpg', name: 'TLS Timor-Leste', country_code: 'TL', country_code_3: 'TLS'},
    {image: '_0021_tonga.jpg', name: 'TON Tonga', country_code: 'TO', country_code_3: 'TON'},
    {image: '_0020_trinidad.jpg', name: 'TTO Trinidad and Tobago', country_code: 'TT', country_code_3: 'TTO'},
    {image: '_0019_tunisia.jpg', name: 'TUN Tunisia', country_code: 'TN', country_code_3: 'TUN'},
    {image: '_0018_turkey.jpg', name: 'TUR Turkey', country_code: 'TR', country_code_3: 'TUR'},
    {image: '_0015_tuvalu.jpg', name: 'TUV Tuvalu', country_code: 'TV', country_code_3: 'TUV'},
    {image: '_0028_taiwan.jpg', name: 'TWN Taiwan, Republic of China', country_code: 'TW', country_code_3: 'TWN'},
    {image: '_0026_tanzania.jpg', name: 'TZA Tanzania, United Republic of', country_code: 'TZ', country_code_3: 'TZA'},
    {image: '_0014_uganda.jpg', name: 'UGA Uganda', country_code: 'UG', country_code_3: 'UGA'},
    {image: '_0013_ukraine.jpg', name: 'UKR Ukraine', country_code: 'UA', country_code_3: 'UKR'},
    {image: '_0010_usa.jpg', name: 'UMI US Minor Outlying Islands', country_code: 'UM', country_code_3: 'UMI'},
    {image: '_0009_uruguay.jpg', name: 'URY Uruguay', country_code: 'UY', country_code_3: 'URY'},
    {image: '_0010_usa.jpg', name: 'USA United States', country_code: 'US', country_code_3: 'USA'},
    {image: '_0008_uzbekistan.jpg', name: 'UZB Uzbekistan', country_code: 'UZ', country_code_3: 'UZB'},
    {
        image: '_0054_saint vicent.jpg',
        name: 'VCT Saint Vincent and Grenadines',
        country_code: 'VC',
        country_code_3: 'VCT'
    },
    {
        image: '_0006_venezuela.jpg',
        name: 'VEN Venezuela (Bolivarian Republic)',
        country_code: 'VE',
        country_code_3: 'VEN'
    },
    {
        image: '_0210_British Indian Ocean Territory.jpg',
        name: 'VGB British Virgin Islands',
        country_code: 'VG',
        country_code_3: 'VGB'
    },
    {image: 'Virgin_Islands_lgflag.gif', name: 'VIR Virgin Islands, US', country_code: 'VI', country_code_3: 'VIR'},
    {image: '_0005_vietinam.jpg', name: 'VNM Viet Nam', country_code: 'VN', country_code_3: 'VNM'},
    {image: '_0007_vanatu.jpg', name: 'VUT Vanuatu', country_code: 'VU', country_code_3: 'VUT'},
    {image: '_0004_wallis.jpg', name: 'WLF Wallis and Futuna Islands', country_code: 'WF', country_code_3: 'WLF'},
    {image: '_0053_samoa.jpg', name: 'WSM Samoa', country_code: 'WS', country_code_3: 'WSM'},
    {image: '_0002_yemen.jpg', name: 'YEM Yemen', country_code: 'YE', country_code_3: 'YEM'},
    {image: '_0039_south africa.jpg', name: 'ZAF South Africa', country_code: 'ZA', country_code_3: 'ZAF'},
    {image: '_0001_zambia.jpg', name: 'ZMB Zambia', country_code: 'ZM', country_code_3: ''},
    {image: '_0000_zimbabue.jpg', name: 'ZWE Zimbabwe', country_code: 'ZW', country_code_3: 'ZWE'},
];

