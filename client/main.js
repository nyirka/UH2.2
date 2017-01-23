import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

//import './main.html';
//Session.set('markColor', "white");
//Meteor.subscribe('getMainText', TurkServer.group));
//Meteor.subscribe('getMarked', TurkServer.group());

Session.set('triesLeft', 2);

Tracker.autorun(function() {
    var group = TurkServer.group();
    console.log('-------------Tracker.autorun');
    console.log(group);
    if (group != null) {
        Meteor.subscribe('getMainText', group);
        Meteor.subscribe('getMarked', group);
        Meteor.subscribe('getUHexperiments', group);
        Meteor.subscribe('getTestText', group);
        Meteor.subscribe('getTestMarked', group);
        //Meteor.subscribe('bigLog', group);
    }
    else if (TurkServer.isAdmin()) {
        console.log('-------------Admin subscriptions:');
        Meteor.subscribe('getMainText', true);
        Meteor.subscribe('getMarked', true);
        Meteor.subscribe('getUHexperiments', true);
        Meteor.subscribe('getTestText', true);
        Meteor.subscribe('getTestMarked', true);
        Meteor.subscribe('bigLog', true);
        //console.log('-------------Admin subscriptions done');
    }

    console.log(TurkServer.inExitSurvey());
    if (TurkServer.inExperiment()) {
        Router.go('/description');
    } else if (TurkServer.inExitSurvey()) {
        console.log('---------inExitSurvey');
        Router.go('/thankyou');
    }
});

function markText(keyCode) {
    //add selection:
    console.log('focused', document.activeElement);
    var sStr = "";
    if (window.getSelection) {
        sStr = window.getSelection().toString();
    }
    else if (document.selection && document.selection.type != "Control") {
        sStr = document.selection.createRange().text;
    }
    sStr = sStr.replace(/(\r\n|\n|\r)/gm,"");
    var allText = document.getElementById("allText").innerHTML;
    allText = allText.replace(/(\r\n|\n|\r|\s{2,})/gm,"");
    allText = allText.replace(/(<p>|<\/p>|<mark>|<\/mark>)/g, "");
    var posStr = allText.indexOf(sStr);

    var pids = mainText.find({}, {sort: {pid: 1}}).fetch();
    var lenText = 0;
    for (var i = 0; i < pids.length && posStr > -1 && sStr.length > 0; i++) {
        var plen = parseInt(pids[i].plen, 10);
        console.log(lenText + " + " + plen + " >= " + posStr);
        if (lenText + plen > posStr) {
            var startPos, endPos;
            if ((lenText + plen) < (posStr + sStr.length)) {
                endPos = plen;
            }
            else {
                var pPos = posStr + sStr.length - lenText;
                endPos = pPos;
                sStr = "";
                //document.getSelection().removeAllRanges();
                if (window.getSelection) {
                    if (window.getSelection().empty) {  // Chrome
                        window.getSelection().empty();
                    } else if (window.getSelection().removeAllRanges) {  // Firefox
                        window.getSelection().removeAllRanges();
                    }
                } else if (document.selection) {  // IE?
                    document.selection.empty();
                }
            }
            if ((lenText < posStr) && (lenText + plen > posStr)) {
                var pPos = posStr - lenText;
                startPos = pPos;
            }
            else {
                startPos = 0;
            }
            var marks = marked.find({pId: pids[i].pid}).fetch();
            for (var j = 0; j < marks.length; j++) {
                if (keyCode === 83 && parseInt(marks[j].endPos, 10) >= startPos && endPos >= parseInt(marks[j].startPos, 10)) {
                    startPos = Math.min(startPos, parseInt(marks[j].startPos));
                    endPos = Math.max(endPos, parseInt(marks[j].endPos));
                    marked.remove({_id: marks[j]._id});
                }
                else if (keyCode === 68 && parseInt(marks[j].endPos, 10) <= endPos && parseInt(marks[j].startPos, 10) >= startPos) {
                    marked.remove({_id: marks[j]._id});
                }
                else if (keyCode === 68 && parseInt(marks[j].endPos, 10) > endPos && parseInt(marks[j].startPos, 10) < startPos) {
                    marked.update(marks[j]._id, {$set: {endPos: startPos}});
                    marked.insert({groupId: TurkServer.group(), pId: pids[i].pid, startPos: endPos, endPos: parseInt(marks[j].endPos, 10)});
                    //Meteor.call('insertMarked',  pids[i].pid, endPos, parseInt(marks[j].endPos, 10));
                }
                else if (keyCode === 68 && parseInt(marks[j].endPos, 10) >= startPos && parseInt(marks[j].startPos, 10) < startPos) {
                    marked.update(marks[j]._id, {$set: {endPos: startPos}});
                }
                else if (keyCode === 68 && parseInt(marks[j].endPos, 10) > endPos && parseInt(marks[j].startPos, 10) <= endPos) {
                    marked.update(marks[j]._id, {$set: {startPos: endPos}});
                }
            }
            if (keyCode === 83) {
                marked.insert({groupId: TurkServer.group(), pId: pids[i].pid, startPos: startPos, endPos: endPos});
                //Meteor.call('insertMarked',  pids[i].pid, startPos, endPos);
            }

            marks = marked.find({pId: pids[i].pid}, {sort: {endPos: -1}}).fetch();
            var markedText = pids[i].text;
            for (var j = 0; j < marks.length; j++) {
                markedText = [markedText.slice(0, parseInt(marks[j].endPos, 10)), "</mark>", markedText.slice(parseInt(marks[j].endPos, 10))].join('');
                markedText = [markedText.slice(0, parseInt(marks[j].startPos, 10)), "<mark>", markedText.slice(parseInt(marks[j].startPos, 10))].join('');
            }
            console.log(markedText);
            mainText.update(pids[i]._id, {$set: {markedText: markedText}});
            //Meteor.call('updateMainText', pids[i]._id, markedText);
        }
        lenText += plen;
    }
};

function getDateTime() {
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/"
        + (currentdate.getMonth() + 1) + "/"
        + currentdate.getFullYear() + " @ "
        + currentdate.getHours() + ":"
        + currentdate.getMinutes() + ":"
        + currentdate.getSeconds();
    return {
        msec: currentdate,
        dateStr: datetime
    };
};

function logIt(e, eventId, templateId) {
    console.log('logIt here');
    var dateTime = getDateTime();
    bigLog.insert({groupId: TurkServer.group(), elementId: e.target.id.toString(), elementType: e.target.toString(), eventId: eventId, templateId: templateId, currMsec: dateTime.msec, currDateStr: dateTime.dateStr});
};

/*Template.description.onCreated(() => {
    var exp = UHexperiments.findOne();
    if (exp && exp.quizDone) {
        $("#taskTabLi").removeClass('disabled');
        return true;
    }
});*/

/*Template.quiz.onCreated(() => {
    var exp = UHexperiments.findOne();
    if (exp && exp.quizDone) {
        $("#taskTabLi").removeClass('disabled');
        if (document.getElementById('wrongQuiz'))
            document.getElementById('wrongQuiz').style.visibility = 'hidden';
        if (document.getElementById('questBudget1Right')) {
            document.getElementById('questBudget1Right').checked = true;
            document.getElementById('questBudget2Right').checked = true;
            document.getElementById('questBudget3Right').checked = true;
            document.getElementById('questBudget4Right').checked = true;
            document.getElementById('questBudget5Right').checked = true;
        }
        if (document.getElementById('questFamous1Right')) {
            document.getElementById('questFamous1Right').checked = true;
            if (exp.experimentType != "3A")
                document.getElementById('questFamous2Right1').checked = true;
            else
                document.getElementById('questFamous2Right2').checked = true;
        }
        if (document.getElementById('questEvents1Right')) {
            document.getElementById('questEvents1Right').checked = true;
            document.getElementById('questEvents2Right').checked = true;
            if (exp.experimentType != "3A")
                document.getElementById('questEvents3Right1').checked = true;
            else
                document.getElementById('questEvents3Right2').checked = true;
        }
        if (document.getElementById('right3'))
            document.getElementById('right3').checked = true;
        if (document.getElementById('right3'))
            document.getElementById('right3').checked = true;
        return true;
    }
});*/
/*
function saveCheck(cb) {
  session.log(cd, ' checked');
};*/

function checkQuiz(e) {
    console.log('------------------------quizCheck');
    var exp = UHexperiments.findOne();
    if (exp && exp.quizDone) {
        $("#taskTabLi").removeClass('disabled');
        if (document.getElementById('wrongQuiz'))
            document.getElementById('wrongQuiz').style.visibility = 'hidden';
        return true;
    }
    else if (exp && document.getElementById('quizHeader') != null &&
            /*(exp.experimentType != "3A" ||
            exp.experimentType == "3A" &&
            document.getElementById('right3').checked &&
            document.getElementById('right4').checked) &&*/
            (exp.question == "Events" &&
            ((document.getElementById('questEvents1Right').checked ? 1 : 0) +
            (document.getElementById('questEvents2Right').checked ? 1 : 0) +
            ((exp.experimentType != "3A" && document.getElementById('questEvents3Right1').checked ||
            exp.experimentType == "3A" && document.getElementById('questEvents3Right2').checked) ? 1 : 0) +
            (document.getElementById('questEvents4Right').checked ? 1 : 0)) >= 3 ||
            exp.question == "Famous" &&
            ((document.getElementById('questFamous1Right').checked ? 1 : 0) +
            (document.getElementById('questFamous3Right').checked ? 1 : 0) +
            ((exp.experimentType != "3A" && document.getElementById('questFamous2Right1').checked ||
            exp.experimentType == "3A" && document.getElementById('questFamous2Right2').checked) ? 1 : 0) +
            (document.getElementById('questFamous4Right').checked ? 1 : 0)) >= 3 ||
            /*document.getElementById('questFamous1Right').checked &&
            (exp.experimentType != "3A" && document.getElementById('questFamous2Right1').checked ||
            exp.experimentType == "3A" && document.getElementById('questFamous2Right2').checked) ||*/
            exp.question == "Budget" &&
            ((document.getElementById('questBudget1Right').checked ? 1 : 0) +
            (document.getElementById('questBudge2Right').checked ? 1 : 0) +
            (document.getElementById('questBudge3Right').checked ? 1 : 0) +
            (document.getElementById('questBudge5Right').checked ? 1 : 0)) >= 3)) {
        $("#taskTabLi").removeClass('disabled');
        UHexperiments.update(exp._id, {$set: {quizDone: true}});
        document.getElementById('wrongQuiz').style.visibility = 'hidden';
        return true;
    }
    else {
        e.preventDefault();
        if (document.getElementById('wrongQuiz'))
            document.getElementById('wrongQuiz').style.visibility = 'visible';
        var num = parseInt(Session.get('triesLeft'), 10) - 1;
        Session.set('triesLeft', num);
        console.log('before checking num');
        if (num <= 0) {
            console.log('fater checking num. Router go');
            Router.go('/failed');
        }
        else {
            console.log('after checking num return false');
            return false;
        }
    }
};

Template.layout.events({
    /*'mousedown': function(e) {
        //console.log(e.target);
        //var dateTime = getDateTime();
        //bigLog.insert({userId: 1, elementId: e.target.id.toString(), elementType: e.target.toString(), eventId: 'mousedown', templateId: 'description', currMsec: dateTime.msec, currDateStr: dateTime.dateStr});
        logIt(e, 'mousedown', 'description');
        console.log('click 1');
        e.target.click();
    },*/
    'click #taskTabLink': function(e) {
        //return checkQuiz(e);
        //console.log('click 2');
        logIt(e, 'click', 'layout');
        var exp = UHexperiments.findOne();
        if (exp && exp.quizDone) {
            $("#taskTabLi").removeClass('disabled');
            if (document.getElementById('wrongQuiz'))
                document.getElementById('wrongQuiz').style.visibility = 'hidden';
            return true;
        }
        else
            return false;
    },
    'click .disableEnable': function(e) {
        //console.log('click 3');
        logIt(e, 'click', 'layout');
        if (document.getElementById('templateStart') || document.getElementById('templateThankyou') || document.getElementById('templateFailed'))
            return false;
        else
            return true;
    }/*,
    'click #menuDescription': function(e) {
    },
    'click #menuQuiz': function(e) {
    },
    'click #menuTaskA': function(e) {
    },
    'click #menuTaskB': function(e) {
    }*/
});

Template.description.events({
    'mousedown': function(e) {
        //console.log(e.target);
        //var dateTime = getDateTime();
        //bigLog.insert({userId: 1, elementId: e.target.id.toString(), elementType: e.target.toString(), eventId: 'mousedown', templateId: 'description', currMsec: dateTime.msec, currDateStr: dateTime.dateStr});
        logIt(e, 'mousedown', 'description');
        //e.target.click();
    },
    'click #nextDescr': function(e) {
        //var result = Meteor.call('goToBudgetExitSurvey');
        //console.log(result);
        //var dateTime = getDateTime();
        //bigLog.insert({userId: 0, ObjectId: "nextDescr", eventId: 'click', templateId: 'description', currMsec: dateTime.msec, currDateStr: dateTime.dateStr});
    }
});

Template.description.helpers({
    'experimentType': function(experimentType, experimentQuest) {
        console.log('----------------------------experimentType:', experimentType, experimentQuest);
        var exp = UHexperiments.findOne();
        if (exp && experimentType == exp.experimentType && experimentQuest == exp.question)
            return true;
        else
            return null;
    }
});

Template.yesNo.helpers({
    'experimentType': function(p) {
        var exp = UHexperiments.findOne();
        if (exp && exp.question == p)
            return true;
        else
            return null;
    },
    'isDisabled': function(btn) {
        if (Session.get('timeoutSet'))
            return 'enabled';
        else {
            setTimeout(function () {
                $("#yesAnswer").removeClass('disabled');
                $("#noAnswer").removeClass('disabled');
                Session.set('timeoutSet', true);
            }, 240000);
            return 'disabled';
        }
    }
});

Template.quiz.helpers({
    'experimentType': function(p) {
        var exp = UHexperiments.findOne();
        if (exp && (exp.experimentType == p || exp.question == p))
            return true;
        else
            return false;
    },
    'setAnswerCB': function(name, id) {
        console.log('------------------------setAnswerCB', name, id);
        var checkedId = Session.get(name);
        if (checkedId == id)
            return true;
        else
            return false;
    },
    'triesLeft': function() {
        var num = Session.get('triesLeft');
        return num;
    }
});

Template.quiz.events({
    'click #quizCheck': function(e) {
        console.log('click 4');
        checkQuiz(e);
/*        console.log('------------------------quizCheck');
        var exp = UHexperiments.findOne();
        if (document.getElementById('right1').checked &&
            ((exp.experimentType == '1' || exp.experimentType == '3B') && document.getElementById('right21').checked ||
             exp.experimentType == '2' && document.getElementById('right22').checked ||
             exp.experimentType == '3A' && document.getElementById('right21').checked) &&
            ((exp.experimentType == '3A' || exp.experimentType == '2') && document.getElementById('right3').checked && document.getElementById('right4').checked ||
             exp.experimentType == '1' || exp.experimentType == '2B')) {
            $("#taskTabLi").removeClass('disabled');
            //document.getElementById('taskTabLink').href = '/itemUI';
        }
        else {
            e.preventDefault();
            return false;
        }*/
    },
    'click .answerCB': function(cb) {
        console.log('------------------------click .ansterCB:', cb.target.name, cb.target.id);
        console.log('click 5');
        var exp = UHexperiments.findOne();
        if (!(exp && exp.quizDone))
            Session.set(cb.target.name, cb.target.id);
        return true;
    }
});

Template.thankyou.events({
    'submit .survey': function (e) {
        console.log('------thankyou submit .survey');
        e.preventDefault();
        var results = {confusing: e.target.confusing.value, feedback: e.target.feedback.value};
        TurkServer.submitExitSurvey(results);
    }
});


/*Template.yesNo.onCreated(() => {
    if (Session.get('timeoutSet')) {
        $("#yesAnswer").removeClass('disabled');
        $("#noAnswer").removeClass('disabled');
    }
    else {
        setTimeout(function () {
            $("#yesAnswer").removeClass('disabled');
            $("#noAnswer").removeClass('disabled');
        }, 6000);
        Session.set('timeoutSet', true);
    }
});*/

Template.yesNo.events({
    //'mousedown': function(e) {
    //    logIt(e, 'mousedown', 'yesNo');
        //e.target.click();
    //},
    'click button#yesAnswer': function(e) {
        console.log('yes pressed');
        if (Session.get('timeoutSet')) {
            Meteor.call('sendAnswer', 'Yes');
            Meteor.call('goToExitSurvey');
        }
        //var result = {result: 'yes'};
        //TurkServer.submitExitSurvey(result);
        //Router.go('thankyou');
    },
    'click button#noAnswer': function(e) {
        console.log('no pressed');
        if (Session.get('timeoutSet')) {
            Meteor.call('sendAnswer', 'No');
            Meteor.call('goToExitSurvey');
        }
        //var result = {result: 'no'};
        //TurkServer.submitExitSurvey(result);
        //Router.go('thankyou');
    }
});

Template.itemText.onCreated(() => {
    $(document).on('keyup', (e) => {
        console.log('focused', document.activeElement);
        var exp = UHexperiments.findOne();
        if ((exp.experimentType == '2' || exp.experimentType == '3A') && (e.which === 68 || e.which === 83)) {
            markText(e.which);
        }
    });
});

function markTestText(keyCode) {
    var sStr = "";
    if (window.getSelection) {
        sStr = window.getSelection().toString();
    }
    else if (document.selection && document.selection.type != "Control") {
        sStr = document.selection.createRange().text;
    }
    sStr = sStr.replace(/(\r\n|\n|\r)/gm,"");
    var allText = testText.findOne({name: 'testTask'});
    var startPos = allText.text.indexOf(sStr);
    var endPos = startPos + sStr.length;

    var marks = testMarked.find({pId: 0}).fetch();
    for (var j = 0; j < marks.length; j++) {
        if (keyCode === 83 && parseInt(marks[j].endPos, 10) >= startPos && endPos >= parseInt(marks[j].startPos, 10)) {
            startPos = Math.min(startPos, parseInt(marks[j].startPos));
            endPos = Math.max(endPos, parseInt(marks[j].endPos));
            testMarked.remove({_id: marks[j]._id});
        }
        else if (keyCode === 68 && parseInt(marks[j].endPos, 10) <= endPos && parseInt(marks[j].startPos, 10) >= startPos) {
            testMarked.remove({_id: marks[j]._id});
        }
        else if (keyCode === 68 && parseInt(marks[j].endPos, 10) > endPos && parseInt(marks[j].startPos, 10) < startPos) {
            testMarked.update(marks[j]._id, {$set: {endPos: startPos}});
            testMarked.insert({groupId: TurkServer.group(), pId: 0, startPos: endPos, endPos: parseInt(marks[j].endPos, 10)});
        }
        else if (keyCode === 68 && parseInt(marks[j].endPos, 10) >= startPos && parseInt(marks[j].startPos, 10) < startPos) {
            testMarked.update(marks[j]._id, {$set: {endPos: startPos}});
        }
        else if (keyCode === 68 && parseInt(marks[j].endPos, 10) > endPos && parseInt(marks[j].startPos, 10) <= endPos) {
            testMarked.update(marks[j]._id, {$set: {startPos: endPos}});
        }
    }
    if (keyCode === 83) {
        testMarked.insert({groupId: TurkServer.group(), pId: 0, startPos: startPos, endPos: endPos});
    }

    marks = testMarked.find({pId: 0}, {sort: {endPos: -1}}).fetch();
    var markedText = allText.text;
    var testDone = true;
    for (var j = 0; j < marks.length; j++) {
        markedText = [markedText.slice(0, parseInt(marks[j].endPos, 10)), "</mark>", markedText.slice(parseInt(marks[j].endPos, 10))].join('');
        markedText = [markedText.slice(0, parseInt(marks[j].startPos, 10)), "<mark>", markedText.slice(parseInt(marks[j].startPos, 10))].join('');
        if (!(marks[j].startPos >= 668 && marks[j].endPos <= 699 ||
            marks[j].startPos >= 594 && marks[j].endPos <= 620 ||
            marks[j].startPos >= 507 && marks[j].endPos <= 527 ||
            marks[j].startPos >= 359 && marks[j].endPos <= 377 ||
            marks[j].startPos >= 79 && marks[j].endPos <= 100))
            testDone = false;
    }
    console.log(markedText);
    testText.update(markedText._id, {$set: {markedText: markedText}});

    //check if the test task was accomplished:
    if (marks.length >= 5 && marks.length <= 7 && testDone) {
        var exp = UHexperiments.findOne();
        UHexperiments.update(exp._id, {$set: {testDone: true}});
    }
};

function isTestTask() {
    var exp = UHexperiments.findOne();
    if (exp /*&& (exp.experimentType == '3A' || exp.experimentType == '2')*/ && !exp.testDone)
        return true;
    else
        return false;
};

Template.itemUI.onCreated(() => {
    $(document).on('keyup', (e) => {
        if (isTestTask() && (e.which === 68 || e.which === 83)) {
            markTestText(e.which);
        }
    });
});

Template.itemUI.helpers({
    'provideAnswer': function() {
        var exp = UHexperiments.findOne();
        if (exp && exp.experimentType != '3A') {
            //document.getElementById('submitMarked').style.visibility = 'visible';
            return true;
        }
        else {
            //document.getElementById('submitMarked').style.visibility = 'hidden';
            return false;
        }
    },
    'testTask': function() {
        return isTestTask();
    },
    'showTestText': function() {
        console.log('--------------showTestText:');
        console.log('textText.find.count:', testText.find({name: 'testTask'}).count());
        var main = testText.findOne({name: 'testTask'});
        var marks = testMarked.find({pId: 0}, {sort: {endPos: -1}}).fetch();
        if (main && marks) {
            var markedText = main.text;
            for (var j = 0; j < marks.length; j++) {
                markedText = [markedText.slice(0, parseInt(marks[j].endPos, 10)), "</mark>", markedText.slice(parseInt(marks[j].endPos, 10))].join('');
                markedText = [markedText.slice(0, parseInt(marks[j].startPos, 10)), "<mark>", markedText.slice(parseInt(marks[j].startPos, 10))].join('');
            }
            console.log(markedText);
            testText.update(main._id, {$set: {markedText: markedText}});
            return testText.find({name: 'testTask'}, {sort: {pid: 1}}).fetch();
        }
        else
            return null;
    },
    'experimentType': function(etype, quest) {
        var exp = UHexperiments.findOne();
        if (exp && exp.experimentType == etype && (exp.question == quest || quest == "All")) {
            return true;
        }
        else {
            return false;
        }
    },
    'showRightAnswer': function(etype, quest) {
        if (Session.get('testAnswer'))
            return 'visibility: visible';
        else
            return 'visibility: hidden';
    },
    'highlightClues': function(etype, quest) {
        if (Session.get('testAnswer'))
            return 'background-color: lightblue';
        else
            return '';
    },
    'isVisible': function() {
        if (Session.get('timeoutSet'))
            return 'hidden';
        else
            return 'visible';
   }
});

Template.itemUI.events({
    'click #testP': function(e) {
    },
    'click button#submitMarked': function(e) {
        console.log('submitMarked pressed');
        Meteor.call('sendAnswer', '');
        Meteor.call('goToExitSurvey');
    },
    'click button#testYesAnswer': function() {
        Session.set('testAnswer', true);
        if (document.getElementById('rightTestAnswer'))
            document.getElementById('rightTestAnswer').style.visibility = 'visible';
    },
    'click button#testNoAnswer': function() {
        Session.set('testAnswer', true);
        if (document.getElementById('rightTestAnswer'))
            document.getElementById('rightTestAnswer').style.visibility = 'visible';
        Session.set('testFailed', true);
    },
    'click button#gotIt': function() {
        var exp = UHexperiments.findOne();
        if (Session.get('testFailed'))
            //Router.go('/failed');
            UHexperiments.update(exp._id, {$set: {testDone: true}});
        else {
            UHexperiments.update(exp._id, {$set: {testDone: true}});
        }
    }
});

Template.itemText.events({
    /*'click .search': function(e) {
        //e.preventDefault();
        var markColor = Session.get('markColor');
        //console.log(markColor);
        Session.set('markColor', "yellow");
    },
    'click .similarity': function(e) {
        $('input[name="searchInput"]').val("cost,money,$,€");
    },*/
    'click #resetBtn': function(e) {
        console.log("reset");
        /*var pids = mainText.find({name: 'Kitzbuel'}).fetch();
        var lenText = 0;
        for (var i = 0; i < pids.length; i++) {
            mainText.update(pids[i]._id, {$set: {markedText: pids[i].text}});
        }*/
        var marks = marked.find().fetch();
        for (var j = 0; j < marks.length; j++) {
            marked.remove({_id: marks[j]._id});
        }
        /*var mm = mainText.find().fetch();
        for (var j = 0; j < mm.length; j++) {
            mainText.remove({_id: mm[j]._id});
        }
        //document.getElementById('resetBtn').style.visibility = 'hidden';
        if (mainText.find().count() == 0) {
            mainText.insert({name: "Kitzbuel", pid: 1, text: "Kitzbuhel is a small medieval town situated along the river Kitzbuhler Ache in Tyrol, Austria and the administrative centre of the Kitzbuhel district (Bezirk). It has a population of 8,134 (as of 1 January 2013). The town is situated in the Kitzbuhel Alps about 100 kilometres (62 mi) east of the state capital of Innsbruck. It is a ski resort of international renown.", plen: "368", markedText: "Kitzbuhel is a small medieval town situated along the river Kitzbuhler Ache in Tyrol, Austria and the administrative centre of the Kitzbuhel district (Bezirk). It has a population of 8,134 (as of 1 January 2013). The town is situated in the Kitzbuhel Alps about 100 kilometres (62 mi) east of the state capital of Innsbruck. It is a ski resort of international renown."});
            mainText.insert({name: "Kitzbuel", pid: 2, text: "Kitzbuhel, situated on the Kitzbuheler Ache river, is a large valley town with most of its centre car-free, and with a large selection of up-market shops and cafes.", plen: "164", markedText: "Kitzbuhel, situated on the Kitzbuheler Ache river, is a large valley town with most of its centre car-free, and with a large selection of up-market shops and cafes."});
            mainText.insert({name: "Kitzbuel", pid: 3, text: "The town borough is subdivided into the municipalities of: Am Horn, Aschbachbichl, Badhaussiedlung, Bichlach, Ecking, Felseneck, Griesenau, Griesenauweg, Gundhabing, Hagstein, Hausstatt, Henntal, Jodlfeld, Kaps, Muhlau, Obernau, Schattberg, Seereith, Siedlung Frieden, Am Sonnberg, Sonnenhoffeld, Staudach, Stockerdörfl and Zephirau.", plen: "333", markedText: "The town borough is subdivided into the municipalities of: Am Horn, Aschbachbichl, Badhaussiedlung, Bichlach, Ecking, Felseneck, Griesenau, Griesenauweg, Gundhabing, Hagstein, Hausstatt, Henntal, Jodlfeld, Kaps, Muhlau, Obernau, Schattberg, Seereith, Siedlung Frieden, Am Sonnberg, Sonnenhoffeld, Staudach, Stockerdörfl and Zephirau."});
            mainText.insert({name: "Kitzbuel", pid: 4, text: "Kitzbuhel's neighbouring municipalities are: Aurach bei Kitzbuhel, Jochberg, Kirchberg in Tirol, Oberndorf in Tirol, Reith bei Kitzbuhel, St. Johann in Tirol and Fieberbrunn.", plen: "174", markedText: "Kitzbuhel's neighbouring municipalities are: Aurach bei Kitzbuhel, Jochberg, Kirchberg in Tirol, Oberndorf in Tirol, Reith bei Kitzbuhel, St. Johann in Tirol and Fieberbrunn."});
            mainText.insert({name: "Kitzbuel", pid: 5, text: "The first known settlers were Illyrians mining copper in the hills around Kitzbuhel between 1100 and 800 BC.", plen: "108", markedText: "The first known settlers were Illyrians mining copper in the hills around Kitzbuhel between 1100 and 800 BC."});
            mainText.insert({name: "Kitzbuel", pid: 6, text: "Around 15 BC, the Romans under Emperor Augustus extended their empire to include the Alps and established the province of Noricum. After the fall of the western Roman Empire, Bavarii settled in the Kitzbuhel region around 800 and started clearing forests.", plen: "255", markedText: "Around 15 BC, the Romans under Emperor Augustus extended their empire to include the Alps and established the province of Noricum. After the fall of the western Roman Empire, Bavarii settled in the Kitzbuhel region around 800 and started clearing forests."});
            mainText.insert({name: "Kitzbuel", pid: 7, text: "In the 12th century, the name Chizbuhel is mentioned for the first time in a document belonging to the Chiemseemonastery (where it refers to a 'Marquard von Chizbuhel'), whereby Chizzo relates to a Bavarian clan and Buhel refers to the location of a settlement upon a hill. One hundred years later a source refers to the Vogtei of the Bamberg monastery in Kicemgespuchel and, in the 1271 document elevating the settlement to the status of a town, the place is called Chizzingenspuehel.", plen: "485", markedText: "In the 12th century, the name Chizbuhel is mentioned for the first time in a document belonging to the Chiemseemonastery (where it refers to a 'Marquard von Chizbuhel'), whereby Chizzo relates to a Bavarian clan and Buhel refers to the location of a settlement upon a hill. One hundred years later a source refers to the Vogtei of the Bamberg monastery in Kicemgespuchel and, in the 1271 document elevating the settlement to the status of a town, the place is called Chizzingenspuehel."});
            mainText.insert({name: "Kitzbuel", pid: 8, text: "Kitzbuhel became part of Upper Bavaria in 1255 when Bavaria was first partitioned. Duke Ludwig II of Bavaria granted Kitzbuhel town rights on 6 June 1271, and it was fortified with defensive town walls. During the next centuries the town established itself as a market town, growing steadily and remaining unaffected by war and conflict. The town walls were eventually reduced to the level of a single storey building, and the stone used to build residential housing.", plen: "467", markedText: "Kitzbuhel became part of Upper Bavaria in 1255 when Bavaria was first partitioned. Duke Ludwig II of Bavaria granted Kitzbuhel town rights on 6 June 1271, and it was fortified with defensive town walls. During the next centuries the town established itself as a market town, growing steadily and remaining unaffected by war and conflict. The town walls were eventually reduced to the level of a single storey building, and the stone used to build residential housing."});
            mainText.insert({name: "Kitzbuel", pid: 9, text: "When Countess Margarete of Tyrol married the Bavarian, Duke Louis V the Brandenburger, in 1342, Kitzbuhel was temporarily united with the County of Tyrol (that in turn became a Bavarian dominion as a result of the marriage until Louis' death). After the Peace of Schärding (1369) Kitzbuhel was returned to Bavaria. Following the division of Bavaria, Kufstein went to the Landshut line of the House of Wittelsbach. During this time, silver and copper mining in Kitzbuhel expanded steadily and comprehensive mining rights were issued to her that, later, were to become significant to the Bavarian dukedom. On 30 June 1504 Kitzbuhel became a part of Tyrol permanently: the Emperor Maximilian reserved to himself the hitherto Landshut offices (Ämter) of Kitzbuhel, Kufstein and Rattenberg as a part of his Cologne Arbitration (Kölner Schiedsspruch), that had ended the Landshut War of Succession.", plen: "892", markedText: "When Countess Margarete of Tyrol married the Bavarian, Duke Louis V the Brandenburger, in 1342, Kitzbuhel was temporarily united with the County of Tyrol (that in turn became a Bavarian dominion as a result of the marriage until Louis' death). After the Peace of Schärding (1369) Kitzbuhel was returned to Bavaria. Following the division of Bavaria, Kufstein went to the Landshut line of the House of Wittelsbach. During this time, silver and copper mining in Kitzbuhel expanded steadily and comprehensive mining rights were issued to her that, later, were to become significant to the Bavarian dukedom. On 30 June 1504 Kitzbuhel became a part of Tyrol permanently: the Emperor Maximilian reserved to himself the hitherto Landshut offices (Ämter) of Kitzbuhel, Kufstein and Rattenberg as a part of his Cologne Arbitration (Kölner Schiedsspruch), that had ended the Landshut War of Succession."});
            mainText.insert({name: "Kitzbuel", pid: 10, text: "However the law of Louis of Bavaria continued to apply to the three aforementioned places until the 19th century, so that these towns had a special legal status within Tyrol. Maximilian enfeoffed Kitzbuhel, with the result that it came under the rule of the Counts of Lamberg at the end of the 16th century, until 1 May 1840, when Kitzbuhel was ceremonially transferred to the state.", plen: "383", markedText: "However the law of Louis of Bavaria continued to apply to the three aforementioned places until the 19th century, so that these towns had a special legal status within Tyrol. Maximilian enfeoffed Kitzbuhel, with the result that it came under the rule of the Counts of Lamberg at the end of the 16th century, until 1 May 1840, when Kitzbuhel was ceremonially transferred to the state."});
            mainText.insert({name: "Kitzbuel", pid: 11, text: "The wars of the 18th and 19th century bypassed the town, even though its inhabitants participated in the Tyrolean Rebellion against Napoleon. Following the Treaty of Pressburg in 1805, Kitzbuhel once more became part of Bavaria; it was reunited with Tyrol after the fall of Napoleon at the Congress of Vienna. Until 1918, the town (named KITZBICHL before 1895) was part of the Austrian monarchy(Austria side after the compromise of 1867), head of the district of the same name, one of the 21 Bezirkshauptmannschaften in the Tyrol province.", plen: "539", markedText: "The wars of the 18th and 19th century bypassed the town, even though its inhabitants participated in the Tyrolean Rebellion against Napoleon. Following the Treaty of Pressburg in 1805, Kitzbuhel once more became part of Bavaria; it was reunited with Tyrol after the fall of Napoleon at the Congress of Vienna. Until 1918, the town (named KITZBICHL before 1895) was part of the Austrian monarchy(Austria side after the compromise of 1867), head of the district of the same name, one of the 21 Bezirkshauptmannschaften in the Tyrol province."});
            mainText.insert({name: "Kitzbuel", pid: 12, text: "When Emperor Franz Joseph finally resolved the confusing constitutional situation, and following completion of the Salzburg-Tyrol Railway in 1875, the town's trade and industry flourished. In 1894, Kitzbuhel hosted its first ski race, ushering in a new era of tourism and sport.", plen: "278", markedText: "When Emperor Franz Joseph finally resolved the confusing constitutional situation, and following completion of the Salzburg-Tyrol Railway in 1875, the town's trade and industry flourished. In 1894, Kitzbuhel hosted its first ski race, ushering in a new era of tourism and sport."});
            mainText.insert({name: "Kitzbuel", pid: 13, text: "Kitzbuhel also had the good fortune to remain undamaged from the ravages of the First and Second World Wars.Since the year 2000 the town has been a member of the Climate Alliance of Tyrol.", plen: "188", markedText: "Kitzbuhel also had the good fortune to remain undamaged from the ravages of the First and Second World Wars.Since the year 2000 the town has been a member of the Climate Alliance of Tyrol."});
            mainText.insert({name: "Kitzbuel", pid: 14, text: "You can learn more about the history of Kitzbuhel by visiting the local museum. The entrance fee is 5 euro for the adults. Children and students can visit the museum for free.", plen: "175", markedText: "You can learn more about the history of Kitzbuhel by visiting the local museum. The entrance fee is 5 euro for the adults. Children and students can visit the museum for free."});
            mainText.insert({name: "Kitzbuel", pid: 15, text: "Kitzbuhel is one of Austria's best-known and fanciest winter sports resorts, situated between the mountains Hahnenkamm (5616 ft, 1712 m) and Kitzbuhler Horn(6548 ft, 1996 m). The Hahnenkamm is home of the annual World Cup ski races, including the circuit's most important event, the downhill race on the famous Streifslope. This downhill is counted as one of the toughest downhill competitions in the World Cup, and is infamous for having a lot of crashes.", plen: "456", markedText: "Kitzbuhel is one of Austria's best-known and fanciest winter sports resorts, situated between the mountains Hahnenkamm (5616 ft, 1712 m) and Kitzbuhler Horn(6548 ft, 1996 m). The Hahnenkamm is home of the annual World Cup ski races, including the circuit's most important event, the downhill race on the famous Streifslope. This downhill is counted as one of the toughest downhill competitions in the World Cup, and is infamous for having a lot of crashes."});
            mainText.insert({name: "Kitzbuel", pid: 16, text: "In the 1950s, local legends like Ernst Hinterseer, Hias Leitner, Anderl Molterer, Christian Pravda, Fritz Huber Jr. and Toni Sailer wrote skiing history. They put Kitzbuhel on the map and their names still resonate today. Now there is a new generation earning the title of Kitzbuhel legends: Rosi Schipflinger, Axel Naglich, Kaspar Frauenschuh and David Kreiner. With sporting achievements, fashion and food, they are part of Kitzbuhel's unique culture", plen: "452", markedText: "In the 1950s, local legends like Ernst Hinterseer, Hias Leitner, Anderl Molterer, Christian Pravda, Fritz Huber Jr. and Toni Sailer wrote skiing history. They put Kitzbuhel on the map and their names still resonate today. Now there is a new generation earning the title of Kitzbuhel legends: Rosi Schipflinger, Axel Naglich, Kaspar Frauenschuh and David Kreiner. With sporting achievements, fashion and food, they are part of Kitzbuhel's unique culture"});
            mainText.insert({name: "Kitzbuel", pid: 17, text: "Together with the pistes and ski lifts in neighbouring Kirchberg in Tirol, Jochberg and by the Thurn Pass Kitzbuhel is one of the largest ski regions in Austria. With around 10,000 hotel and guest house beds, Kitzbuhel and its neighbours have an unusually high density of guest accommodation.", plen: "292", markedText: "Together with the pistes and ski lifts in neighbouring Kirchberg in Tirol, Jochberg and by the Thurn Pass Kitzbuhel is one of the largest ski regions in Austria. With around 10,000 hotel and guest house beds, Kitzbuhel and its neighbours have an unusually high density of guest accommodation."});
            mainText.insert({name: "Kitzbuel", pid: 18, text: "Holidaymakers in Kitzbuhel have 56 cableway and lift facilities and 168 kilometres of slopes available to them, as well as 40 kilometres of groomed cross-country skiing tracks. Of note is the relatively new 3S Cable Car, the cable car with the highest above-ground span in the world.", plen: "283", markedText: "Holidaymakers in Kitzbuhel have 56 cableway and lift facilities and 168 kilometres of slopes available to them, as well as 40 kilometres of groomed cross-country skiing tracks. Of note is the relatively new 3S Cable Car, the cable car with the highest above-ground span in the world."});
            mainText.insert({name: "Kitzbuel", pid: 19, text: "In summer there are 120 km (75 mi) of mountain bike paths and 500 km (311 mi) of hiking trails.", plen: "95", markedText: "In summer there are 120 km (75 mi) of mountain bike paths and 500 km (311 mi) of hiking trails."});
            mainText.insert({name: "Kitzbuel", pid: 20, text: "Other attractions include six tennis courts and four golf courses, the Kitzbuhel swimming pool, Austria's only curling hall and the bathing lake of Schwarzsee.", plen: "159", markedText: "Other attractions include six tennis courts and four golf courses, the Kitzbuhel swimming pool, Austria's only curling hall and the bathing lake of Schwarzsee."});
            mainText.insert({name: "Kitzbuel", pid: 21, text: "Kitzbuhel also caters for the high end of the tourist market, as many celebrities and the jet set come here for the international races on the Hahnenkamm.", plen: "154", markedText: "Kitzbuhel also caters for the high end of the tourist market, as many celebrities and the jet set come here for the international races on the Hahnenkamm."});
            mainText.insert({name: "Kitzbuel", pid: 22, text: "Together with eleven other towns Kitzbuhel is a member of the community Best of the Alps.", plen: "89", markedText: "Together with eleven other towns Kitzbuhel is a member of the community Best of the Alps."});
            mainText.insert({name: "Kitzbuel", pid: 23, text: "Getting to Kitzbuhel is easy via Salzburg, Innsbruck or Munich airports with short transfer times from all three airports. Transfer options include rail to Kitzbuhel mainline train station and a good bus service to and from Munich airport as well as shared and private minibus transfers from the airports.", plen: "305", markedText: "Getting to Kitzbuhel is easy via Salzburg, Innsbruck or Munich airports with short transfer times from all three airports. Transfer options include rail to Kitzbuhel mainline train station and a good bus service to and from Munich airport as well as shared and private minibus transfers from the airports."});
            mainText.insert({name: "Kitzbuel", pid: 24, text: "There are a number of airlines operating direct flights to Munich: easyJet, Lufthansa, British Airways, Singapure Airlines, Rayan Air.", plen: "134", markedText: "There are a number of airlines operating direct flights to Munich: easyJet, Lufthansa, British Airways, Singapure Airlines, Rayan Air."});
            mainText.insert({name: "Kitzbuel", pid: 25, text: "Kitzbuhel, in the eastern corner of the TIrol, is 74km from Salzburg, 97km from Innsbruck and 174km from Munich. There is also a good bus service to and from Munich airport.", plen: "173", markedText: "Kitzbuhel, in the eastern corner of the TIrol, is 74km from Salzburg, 97km from Innsbruck and 174km from Munich. There is also a good bus service to and from Munich airport."});
            mainText.insert({name: "Kitzbuel", pid: 26, text: "Salzburg Airport - 74km / 1 hour 10 minutes", plen: "43", markedText: "Salzburg Airport - 74km / 1 hour 10 minutes"});
            mainText.insert({name: "Kitzbuel", pid: 27, text: "Innsbruck Airport - 97km / 1 hour 15 minutes", plen: "44", markedText: "Innsbruck Airport - 97km / 1 hour 15 minutes"});
            mainText.insert({name: "Kitzbuel", pid: 28, text: "Munich Airport - 174km / 1 hour 50 minutes", plen: "42", markedText: "Munich Airport - 174km / 1 hour 50 minutes"});
            mainText.insert({name: "Kitzbuel", pid: 31, text: "Four Seasons Travel in Innsbruck provides a reliable airport transfer shuttle service to Kitzbuhel (and other Tirol destinations) from Innsbruck, Munich, Salzburg, Bolzano and Memmingen airports. The range of transfer services includes shared airport shuttle, private transfers in minivans seating up to 8 persons and 19-50 seat coaches for groups and a first class limousine service. Four Seasons customer support includes 24-hour telephone response 365 days per year as well as easy and secure booking online.", plen: "511", markedText: "Four Seasons Travel in Innsbruck provides a reliable airport transfer shuttle service to Kitzbuhel (and other Tirol destinations) from Innsbruck, Munich, Salzburg, Bolzano and Memmingen airports. The range of transfer services includes shared airport shuttle, private transfers in minivans seating up to 8 persons and 19-50 seat coaches for groups and a first class limousine service. Four Seasons customer support includes 24-hour telephone response 365 days per year as well as easy and secure booking online."});
            mainText.insert({name: "Kitzbuel", pid: 32, text: "Discount option for Lufthansa travelors. You will receive a discount of 10 % on both shuttle services. If you book when you arrive, simply show your Lufthansa boarding pass. If booking online, please use the relevant Lufthansa Shuttle pages of Four Seasons Travel and enter your flight number.", plen: "293", markedText: "Discount option for Lufthansa travelors. You will receive a discount of 10 % on both shuttle services. If you book when you arrive, simply show your Lufthansa boarding pass. If booking online, please use the relevant Lufthansa Shuttle pages of Four Seasons Travel and enter your flight number."});
            mainText.insert({name: "Kitzbuel", pid: 34, text: "Kitzbuhel has its own mainline train station, and a post-bus picks up passengers from there every 15 minutes. Regular Eurocity trains depart from Munich and Zurich to Innsbruck, from where several trains daily make the one-hour trip to Kitzbuhel.", plen: "246", markedText: "Kitzbuhel has its own mainline train station, and a post-bus picks up passengers from there every 15 minutes. Regular Eurocity trains depart from Munich and Zurich to Innsbruck, from where several trains daily make the one-hour trip to Kitzbuhel."});
            mainText.insert({name: "Kitzbuel", pid: 35, text: "The Brixental Road, the B170, from Wörgl intersects in Kitzbuhel with the Thurn Pass Road, the B161, from Mittersill to St. Johann in Tirol. Kitzbuhel station is a major bus stop for buses to Lienz and Worgl. The town of the chamois, as Kitzbuhel is affectionately known, is easily accessible by road and by rail. From the airport cities Munich, Salzburg, and Innsbruck, it takes a maximum of one and a half hours by car to get to Kitzbuhel.", plen: "441", markedText: "The Brixental Road, the B170, from Wörgl intersects in Kitzbuhel with the Thurn Pass Road, the B161, from Mittersill to St. Johann in Tirol. Kitzbuhel station is a major bus stop for buses to Lienz and Worgl. The town of the chamois, as Kitzbuhel is affectionately known, is easily accessible by road and by rail. From the airport cities Munich, Salzburg, and Innsbruck, it takes a maximum of one and a half hours by car to get to Kitzbuhel."});
            mainText.insert({name: "Kitzbuel", pid: 37, text: "Kitzbuhel Hauptbahnhof, Kitzbuhel Hahnenkamm and Kitzbuhel Schwarzsee are stops on the Salzburg-Tyrol Railway. Whilst Hahnenkamm and Schwarzsee stations are served by local trains only, long distance services from Innsbruck and Graz stop at Kitzbuhel station. Kitzbuhel station has just been rebuilt (2010) and been equipped with new barrier-less platforms with underpasses and a lift.", plen: "385", markedText: "Kitzbuhel Hauptbahnhof, Kitzbuhel Hahnenkamm and Kitzbuhel Schwarzsee are stops on the Salzburg-Tyrol Railway. Whilst Hahnenkamm and Schwarzsee stations are served by local trains only, long distance services from Innsbruck and Graz stop at Kitzbuhel station. Kitzbuhel station has just been rebuilt (2010) and been equipped with new barrier-less platforms with underpasses and a lift."});
            mainText.insert({name: "Kitzbuel", pid: 38, text: "It is here that skiing was invented, here where ski races have regularly been taking place since 1895 and here where the most important international race of the Winter World Cup has been taking place on the Streif for decades. Yet, it is not only because of Kitzbuhel's fantastic ski resort that so many visitors are taken by the irresistible charm of Kitzbuhel. The unique mix of traditional and contemporary attracts skiers and celebrities from all over the world. The above average number of luxury hotels, the high density of award-winning restaurants in Tyrol and the many unforgettable après-ski events make Kitzbuhel the ideal meeting place for snow enthusiasts all winter long.", plen: "686", markedText: "It is here that skiing was invented, here where ski races have regularly been taking place since 1895 and here where the most important international race of the Winter World Cup has been taking place on the Streif for decades. Yet, it is not only because of Kitzbuhel's fantastic ski resort that so many visitors are taken by the irresistible charm of Kitzbuhel. The unique mix of traditional and contemporary attracts skiers and celebrities from all over the world. The above average number of luxury hotels, the high density of award-winning restaurants in Tyrol and the many unforgettable après-ski events make Kitzbuhel the ideal meeting place for snow enthusiasts all winter long."});
            mainText.insert({name: "Kitzbuel", pid: 39, text: "Big names, ski pioneers and the high society but also Tyrolean down-to-earthness, Gemutlichkeit and hospitality: these contrasts are what make Kitzbuhel one of the greatest ski resorts in the Alps. Kitzbuhel is even recognised as the Best Ski Resort in the World for 2013. With 51 cable cars and lifts, connecting 170 kilometres of ski slopes, Bergbahn AG Kitzbuhel is one of the largest cable car companies in Austria. In addition to the spectacular Streif , Kitzbuhel trumps with a variety of ski runs suiting all sizes and ski styles. In fact, the vast and snow-reliable ski resort boasts an above-average number of family runs (69 km easy, 77 km intermediate, 24 km difficult). The flagship run is, of course, the Family Streif, which elegantly snakes its way around the extremely steep part of the downhill course, before returning to the original racing track at the Seidlalm, dodging the Hausbergkante ridge on the incline Ganslernhang and ends up back at the usual finish. Don t miss out on the most spectacular lift in the world: the 3S-Umlaufbahn (tri-cable gondola). It spans the 2.5-kilometre wide and 400-meter deep Saukaser Valley between the mountains Pengelstein and the Wurzhöhe. Snowboarders and freeskiers will also find their perfect playground on the Resterhöhe. The experienced QParks team lead by Franz Lechner is responsible for the setup of the Hanglalm Park as well as for the park on the Kitzbuheler Horn, including all kicker, rail, jib and tree lines, picnic tables and chill-out areas. Skiers and boarders keen to head off-piste will love Kitzbuhel s 200 km2 backcountry. Around the 32 kilometres of ski routes there are endless opportunities to ride through perfect deep powder snow.", plen: "1714", markedText: "Big names, ski pioneers and the high society but also Tyrolean down-to-earthness, Gemutlichkeit and hospitality: these contrasts are what make Kitzbuhel one of the greatest ski resorts in the Alps. Kitzbuhel is even recognised as the Best Ski Resort in the World for 2013. With 51 cable cars and lifts, connecting 170 kilometres of ski slopes, Bergbahn AG Kitzbuhel is one of the largest cable car companies in Austria. In addition to the spectacular Streif , Kitzbuhel trumps with a variety of ski runs suiting all sizes and ski styles. In fact, the vast and snow-reliable ski resort boasts an above-average number of family runs (69 km easy, 77 km intermediate, 24 km difficult). The flagship run is, of course, the Family Streif, which elegantly snakes its way around the extremely steep part of the downhill course, before returning to the original racing track at the Seidlalm, dodging the Hausbergkante ridge on the incline Ganslernhang and ends up back at the usual finish. Don t miss out on the most spectacular lift in the world: the 3S-Umlaufbahn (tri-cable gondola). It spans the 2.5-kilometre wide and 400-meter deep Saukaser Valley between the mountains Pengelstein and the Wurzhöhe. Snowboarders and freeskiers will also find their perfect playground on the Resterhöhe. The experienced QParks team lead by Franz Lechner is responsible for the setup of the Hanglalm Park as well as for the park on the Kitzbuheler Horn, including all kicker, rail, jib and tree lines, picnic tables and chill-out areas. Skiers and boarders keen to head off-piste will love Kitzbuhel s 200 km2 backcountry. Around the 32 kilometres of ski routes there are endless opportunities to ride through perfect deep powder snow."});
            mainText.insert({name: "Kitzbuel", pid: 40, text: "After dark, the 700-year-old Old Town with its typical apres ski bars and pubs becomes the social hub of the world. Fashionistas will be in their element hopping between international designer addresses, from Bogner and Boss, Gucci, to Prada and Louis Vuitton. And between them, classic Kitzbuhel fashion originals, such as Sportalm, Frauenschuh, Franz Prader and Helmut Eder, add a traditional element to the vibrant collection.", plen: "429", markedText: "After dark, the 700-year-old Old Town with its typical apres ski bars and pubs becomes the social hub of the world. Fashionistas will be in their element hopping between international designer addresses, from Bogner and Boss, Gucci, to Prada and Louis Vuitton. And between them, classic Kitzbuhel fashion originals, such as Sportalm, Frauenschuh, Franz Prader and Helmut Eder, add a traditional element to the vibrant collection."});
            mainText.insert({name: "Kitzbuel", pid: 41, text: "From 24 November to 25 December, the town centre will be transformed into a festive scene. During the holiday period, Kitzbuhel can well and truly say, Welcome to the most magical Christmas town in the Alps!", plen: "207", markedText: "From 24 November to 25 December, the town centre will be transformed into a festive scene. During the holiday period, Kitzbuhel can well and truly say, Welcome to the most magical Christmas town in the Alps!"});
            mainText.insert({name: "Kitzbuel", pid: 42, text: "A further winter attraction is the biggest Polo Tournament staged on a snow covered pitch in the world. Fans gather in their thousands to watch eight teams compete against each other for the honour of winning such a unique and prestigious event.", plen: "245", markedText: "A further winter attraction is the biggest Polo Tournament staged on a snow covered pitch in the world. Fans gather in their thousands to watch eight teams compete against each other for the honour of winning such a unique and prestigious event."});
            mainText.insert({name: "Kitzbuel", pid: 43, text: "The most legendary sports resort in the Alps, awarded the title world s best ski resort for the third time in succession, is taking a break from mountains and slopes to show off its contemplative side. The Gamsstadt (Chamois City) is a paradise for winter sports and summer fun. The Advent season in Kitzbuhel is yet another magical experiences to be enjoyed here. Whether in Kitzbuhel itself, at the foot of the legendary Hahnenkamm at the Hotel Rasmushof, or in the villages of Reith and Jochberg, visitors to the region during the pre-Christmas period will be treated to a variety of Tirolean delights. Featuring a colourful mix of tradition, local customs and international flair, it does not get much more stylish or festive than this.", plen: "740", markedText: "The most legendary sports resort in the Alps, awarded the title world s best ski resort for the third time in succession, is taking a break from mountains and slopes to show off its contemplative side. The Gamsstadt (Chamois City) is a paradise for winter sports and summer fun. The Advent season in Kitzbuhel is yet another magical experiences to be enjoyed here. Whether in Kitzbuhel itself, at the foot of the legendary Hahnenkamm at the Hotel Rasmushof, or in the villages of Reith and Jochberg, visitors to the region during the pre-Christmas period will be treated to a variety of Tirolean delights. Featuring a colourful mix of tradition, local customs and international flair, it does not get much more stylish or festive than this."});
            mainText.insert({name: "Kitzbuel", pid: 44, text: "Don t miss the grand opening in the scenic town centre on 24 November at 6.00 p.m. We recommend getting there on time, as this is certainly one of the most traditional and beautiful Christmas Markets for miles around.", plen: "217", markedText: "Don t miss the grand opening in the scenic town centre on 24 November at 6.00 p.m. We recommend getting there on time, as this is certainly one of the most traditional and beautiful Christmas Markets for miles around."});
            mainText.insert({name: "Kitzbuel", pid: 45, text: "Enjoy a hands-on activity with your children in anticipation of the arrival of Father Christmas. Animals are on hand daily for petting and riding. Cuddling hours are from 3 p.m. to 7 p.m. with pony rides and a petting zoo. But that s not all we have in store for our youngest visitors. Hidden eye-catchers have been hidden throughout to delight and entertain. Visitors can also sample all manner of excellent traditional Tirolean food, of which Kitzbuhel is particularly proud. As temperatures plunge, warm up with culinary delights. After all, this is what the run-up to Christmas is all about! Everywhere one looks, the town abounds with brightly lit stalls brimming with treasures to be discovered. The Alpine joie de vivre is more than just a delight for the palate. At the many craft stalls, shoppers can find regional pottery, basket weaving and carved creations. Every day between 6.00 p.m. and 7.00 p.m., local musicians and choirs will bring the entire market area to life with the sound of music. And that s not all Kitzbuhel has to offer during the pre-Christmas period! Head to the Kitzbuhel Museum, where from 3.00 p.m. on Christmas Eve a Christmas reading session will be held. Your child will be all ears with the magic of the holiday season!", plen: "1257", markedText: "Enjoy a hands-on activity with your children in anticipation of the arrival of Father Christmas. Animals are on hand daily for petting and riding. Cuddling hours are from 3 p.m. to 7 p.m. with pony rides and a petting zoo. But that s not all we have in store for our youngest visitors. Hidden eye-catchers have been hidden throughout to delight and entertain. Visitors can also sample all manner of excellent traditional Tirolean food, of which Kitzbuhel is particularly proud. As temperatures plunge, warm up with culinary delights. After all, this is what the run-up to Christmas is all about! Everywhere one looks, the town abounds with brightly lit stalls brimming with treasures to be discovered. The Alpine joie de vivre is more than just a delight for the palate. At the many craft stalls, shoppers can find regional pottery, basket weaving and carved creations. Every day between 6.00 p.m. and 7.00 p.m., local musicians and choirs will bring the entire market area to life with the sound of music. And that s not all Kitzbuhel has to offer during the pre-Christmas period! Head to the Kitzbuhel Museum, where from 3.00 p.m. on Christmas Eve a Christmas reading session will be held. Your child will be all ears with the magic of the holiday season!"});
            mainText.insert({name: "Kitzbuel", pid: 46, text: "The big highlight in Kitzbuehels year always takes place on 1st January. The Rasmusleiten brings tens of thousands of spectators to an event in extra class: Torch skiing the ski schools 'Red Devils' and 'Element3', fire jumping, music, and of course the spectacular fireworks of the world famous Pyro professionals Armin Lukasser. Beginning: 17.30 hr. Free admission! Moreover, with Reith it is on 30.12. and in Jochberg on the 31.12. A total 3 fireworks displays in 3 days- this is unique to the region! ", plen: "505", markedText: "The big highlight in Kitzbuehels year always takes place on 1st January. The Rasmusleiten brings tens of thousands of spectators to an event in extra class: Torch skiing the ski schools 'Red Devils' and 'Element3', fire jumping, music, and of course the spectacular fireworks of the world famous Pyro professionals Armin Lukasser. Beginning: 17.30 hr. Free admission! Moreover, with Reith it is on 30.12. and in Jochberg on the 31.12. A total 3 fireworks displays in 3 days- this is unique to the region! "});
            mainText.insert({name: "Kitzbuel", pid: 47, text: "Kitzbuehel welcomes the new year with a class winter sport. For the 15th time the Snow Polo World Cup will be held on the outskirts of Kitzbuehel from 12 to 15 January, 2017. The event is regarded as the world's largest polo tournament on snow and shines with action-packed equestrian and elegant ambiance. Enjoy the opening in the centre of Kitzbuehel on Thursday. Come and watch the exciting games from Friday to Sunday against the beautiful backdrop of the Wilder Kaiser. Free admission! ", plen: "491", markedText: "Kitzbuehel welcomes the new year with a class winter sport. For the 15th time the Snow Polo World Cup will be held on the outskirts of Kitzbuehel from 12 to 15 January, 2017. The event is regarded as the world's largest polo tournament on snow and shines with action-packed equestrian and elegant ambiance. Enjoy the opening in the centre of Kitzbuehel on Thursday. Come and watch the exciting games from Friday to Sunday against the beautiful backdrop of the Wilder Kaiser. Free admission! "});
            mainText.insert({name: "Kitzbuel", pid: 48, text: "The 2017 program will start on Thursday, 12 January with the entrance of teams in the centre of Kitzbuehel in front of the 'Hotel Zur Tenne'. There, the teams will be presented to the fans and the press. The action-packed games begin in the morning on the lawn in Munichauer, Reith from Friday 13thto Sunday 15th. All guests and locals are invited to watch and learn the sport with free admission. The social highlight will again be the Saturday's VIP party ('Polo Player's Night') in the elegant tent on the polo field. VIP tickets for days and the VIP evenings are available on game days - locally.", plen: "600", markedText: "The 2017 program will start on Thursday, 12 January with the entrance of teams in the centre of Kitzbuehel in front of the 'Hotel Zur Tenne'. There, the teams will be presented to the fans and the press. The action-packed games begin in the morning on the lawn in Munichauer, Reith from Friday 13thto Sunday 15th. All guests and locals are invited to watch and learn the sport with free admission. The social highlight will again be the Saturday's VIP party ('Polo Player's Night') in the elegant tent on the polo field. VIP tickets for days and the VIP evenings are available on game days - locally."});
            mainText.insert({name: "Kitzbuel", pid: 49, text: " A colourful program provides the Kitzbuehel Snow Arena party atmosphere. There shouldn t be too many prominent faces missing. A contrast with the snow-show: The 'Players Night' on Saturday has a star DJ will entertain the 700 guests at the gala dinner. Despite the prominent onlookers it is casual Kitzbuehel really down to earth. 'Precious does not mean untouchable,' brings Elmar Balster the organizer lifestyle events to the point:' Kitzbuehel 2016, combines world-class polo with Tyrolean joy and fair play'", plen: "512", markedText: " A colourful program provides the Kitzbuehel Snow Arena party atmosphere. There shouldn t be too many prominent faces missing. A contrast with the snow-show: The 'Players Night' on Saturday has a star DJ will entertain the 700 guests at the gala dinner. Despite the prominent onlookers it is casual Kitzbuehel really down to earth. 'Precious does not mean untouchable,' brings Elmar Balster the organizer lifestyle events to the point:' Kitzbuehel 2016, combines world-class polo with Tyrolean joy and fair play'"});
            mainText.insert({name: "Kitzbuel", pid: 50, text: "Polo is a team sport in which there are four players per team, riding on horses, a seven to eight cm. dia, 130 gram ball. The aim is to try to hit the ball with a long wooden stick and score in the opponent's goal. Arena Polo is the same but played on a smaller playing field with only 3 players per team.", plen: "305", markedText: "Polo is a team sport in which there are four players per team, riding on horses, a seven to eight cm. dia, 130 gram ball. The aim is to try to hit the ball with a long wooden stick and score in the opponent's goal. Arena Polo is the same but played on a smaller playing field with only 3 players per team."});
            mainText.insert({name: "Kitzbuel", pid: 51, text: "From 17 to 22 January 2017, the entire ski world gets Hahnenkamm fever. The best ski athletes in the world will gather in Kitzbuehel to celebrate the highlight of the World Cup calendar. The Streif is considered the most spectacular ski run in the world and will require the participants to tackle almost everything.", plen: "316", markedText: "From 17 to 22 January 2017, the entire ski world gets Hahnenkamm fever. The best ski athletes in the world will gather in Kitzbuehel to celebrate the highlight of the World Cup calendar. The Streif is considered the most spectacular ski run in the world and will require the participants to tackle almost everything."});
            mainText.insert({name: "Kitzbuel", pid: 52, text: "Jumps up to 80m, steep slopes up to 85% gradient, speeds up to 140 km/hr, 860 meters height difference from the starting gate (1665m) to the finish (805m). A total length of 3312 metres at more than average speed of 103 km / h.", plen: "227", markedText: "Jumps up to 80m, steep slopes up to 85% gradient, speeds up to 140 km/hr, 860 meters height difference from the starting gate (1665m) to the finish (805m). A total length of 3312 metres at more than average speed of 103 km / h."});
            mainText.insert({name: "Kitzbuel", pid: 53, text: "Since 1931, the Hahnenkamm races has taken place from Kitzbuehel Hausberg mountain. The fixed points since the early years are the run down the Streif and the Slalom on Ganslernhang . The historic-slalom slope will be in use again after short break in the last years. Since the 1990s a super-G on the Streif is disputed, which Friday the ski weekend ushers.", plen: "357", markedText: "Since 1931, the Hahnenkamm races has taken place from Kitzbuehel Hausberg mountain. The fixed points since the early years are the run down the Streif and the Slalom on Ganslernhang . The historic-slalom slope will be in use again after short break in the last years. Since the 1990s a super-G on the Streif is disputed, which Friday the ski weekend ushers."});
            mainText.insert({name: "Kitzbuel", pid: 54, text: "For Kitzbuehel, the Hahnenkamm event the sporting and social highlight of the year and sees the Gamsstadt bursting at the seams with reporters and celebrities from around the world flocking to the streets. A variety of parties and side events take place spread over the whole week. Television pictures of the wintry Kitzbuehel go around the globe and reach 500 million people. You too can also enjoy the unique Hahnenkamm flair in Kitzbuehel and cheer on, with tens of thousands of fans, the best skiers in the world!", plen: "517", markedText: "For Kitzbuehel, the Hahnenkamm event the sporting and social highlight of the year and sees the Gamsstadt bursting at the seams with reporters and celebrities from around the world flocking to the streets. A variety of parties and side events take place spread over the whole week. Television pictures of the wintry Kitzbuehel go around the globe and reach 500 million people. You too can also enjoy the unique Hahnenkamm flair in Kitzbuehel and cheer on, with tens of thousands of fans, the best skiers in the world!"});
            mainText.insert({name: "Kitzbuel", pid: 55, text: "Sick tricks event will be going down on the 18th February, 2017. The Sick Trick Tour Open is the traditional highlight event at the KitzSki Snowpark Kitzbuehel and is, of course, part of the QParks Tour. Due to the friendly support of Planet Sports all freeskiers and snowboarder can battle for 2.500.- EUR in cash or goodies.", plen: "326", markedText: "Sick tricks event will be going down on the 18th February, 2017. The Sick Trick Tour Open is the traditional highlight event at the KitzSki Snowpark Kitzbuehel and is, of course, part of the QParks Tour. Due to the friendly support of Planet Sports all freeskiers and snowboarder can battle for 2.500.- EUR in cash or goodies."});
            mainText.insert({name: "Kitzbuel", pid: 56, text: "The Streif uphill, 860 meters from the finish area to the starting house. Icy key points such Hausbergkante, Steilhang or the Mousetrap. The fastest wins, regardless of what material is used. That race Vertical Up - The Battle of the Hahnenkamm. Be there, whether as an athlete or as a spectator: Saturday, 25th February 2017, from 18.30hr.", plen: "340", markedText: "The Streif uphill, 860 meters from the finish area to the starting house. Icy key points such Hausbergkante, Steilhang or the Mousetrap. The fastest wins, regardless of what material is used. That race Vertical Up - The Battle of the Hahnenkamm. Be there, whether as an athlete or as a spectator: Saturday, 25th February 2017, from 18.30hr."});
            mainText.insert({name: "Kitzbuel", pid: 57, text: "The legendary sports town of Kitzbuehel is home, training centre and resort for many athletes, including for skiers, cross country skiers, tri-athletes, runners, mountain bikers, cyclists, trekkers and climbers. But who is the fittest athlete and the fastest in 'Running up VERTICAL .... the Battle of the Hahnenkamm '?", plen: "319", markedText: "The legendary sports town of Kitzbuehel is home, training centre and resort for many athletes, including for skiers, cross country skiers, tri-athletes, runners, mountain bikers, cyclists, trekkers and climbers. But who is the fittest athlete and the fastest in 'Running up VERTICAL .... the Battle of the Hahnenkamm '?"});
            mainText.insert({name: "Kitzbuel", pid: 58, text: "The goal of 'Streif VERTICAL UP .... The battle on the Hahnenkamm!', which is on the original downhill piste the 'Streif', is 3,312 meters in length and 860 meters difference in altitude run. The winner is who ever reaches the top first. The 'highlight' of the whole story is the set of rules: There are none! Free choice of material as long as ALL is driven under its own power! (No motor) and free choice of route on the Streif (Speed Class) or family Streif (backpack class).", plen: "478", markedText: "The goal of 'Streif VERTICAL UP .... The battle on the Hahnenkamm!', which is on the original downhill piste the 'Streif', is 3,312 meters in length and 860 meters difference in altitude run. The winner is who ever reaches the top first. The 'highlight' of the whole story is the set of rules: There are none! Free choice of material as long as ALL is driven under its own power! (No motor) and free choice of route on the Streif (Speed Class) or family Streif (backpack class)."});
            mainText.insert({name: "Kitzbuel", pid: 59, text: "Streif Vertical Up – The Backpack class. This competition is the absolute 'fun competition' within 'VERTICAL RUN UP .... The battle at the Hahnenkamm'. The athletes have a choice between the original 'Streif' or the family “Streif”. Also in the backpack-Class is free choice of material. The only condition is you must have a backpack including what you need to take with you (or not) and arrive at your destination with it. You will be timed and the start will be in alphabetical order. The backpack-Class is simply fun - without the pressure!", plen: "544", markedText: "Streif Vertical Up – The Backpack class. This competition is the absolute 'fun competition' within 'VERTICAL RUN UP .... The battle at the Hahnenkamm'. The athletes have a choice between the original 'Streif' or the family “Streif”. Also in the backpack-Class is free choice of material. The only condition is you must have a backpack including what you need to take with you (or not) and arrive at your destination with it. You will be timed and the start will be in alphabetical order. The backpack-Class is simply fun - without the pressure!"});
            mainText.insert({name: "Kitzbuel", pid: 60, text: "Prize: a full Ruck Sack with (alcohol free Bier, Speck, Twins Fitness Riegel, etc.) and an extra prize.", plen: "103", markedText: "Prize: a full Ruck Sack with (alcohol free Bier, Speck, Twins Fitness Riegel, etc.) and an extra prize."});
            mainText.insert({name: "Kitzbuel", pid: 61, text: "Streif Vertical Up – The Fastest. This competition is the 'supreme discipline' within 'VERTICAL STREIF UP .... The battle at the Hahnenkamm '. Each athlete must master the original vertical Streif downhill from the bottom to the top as fast as possible. You have a free choice of material, shoes and clothing.", plen: "309", markedText: "Streif Vertical Up – The Fastest. This competition is the 'supreme discipline' within 'VERTICAL STREIF UP .... The battle at the Hahnenkamm '. Each athlete must master the original vertical Streif downhill from the bottom to the top as fast as possible. You have a free choice of material, shoes and clothing."});
            mainText.insert({name: "Kitzbuel", pid: 62, text: "Timing and Ranking: YES", plen: "23", markedText: "Timing and Ranking: YES"});
            mainText.insert({name: "Kitzbuel", pid: 63, text: "Price: € 3000, - prize money and prizes", plen: "39", markedText: "Price: € 3000, - prize money and prizes"});
            mainText.insert({name: "Kitzbuel", pid: 64, text: "You can enjoy the guided walking tours for free. Our guide Engelbert will take you to the most marvellous places in the Kitzbühel Alps. When: from Monday to Friday. Meetingplace: 09.45 a.m Kitzbühel Tourismus", plen: "208", markedText: "You can enjoy the guided walking tours for free. Our guide Engelbert will take you to the most marvellous places in the Kitzbühel Alps. When: from Monday to Friday. Meetingplace: 09.45 a.m Kitzbühel Tourismus"});
            mainText.insert({name: "Kitzbuel", pid: 65, text: "Wildpark Aurach locates 4 km south of Kitzbuehel, towards Jochberg and Felbertauern. Turn off of the B 161 in Aurach towards Oberaurach and follow the signs for the Wildpark . Approx. 200 animals living at 1,100 m above sea level in Tyrol's largest outdoor enclosure on 40 hectares. On the tour you will encounter deer, lynx, wild boar, yak, zebu, marmots, wild ducks, pheasants, peacocks, ibex etc. in enclosures or in the wild.", plen: "429", markedText: "Wildpark Aurach locates 4 km south of Kitzbuehel, towards Jochberg and Felbertauern. Turn off of the B 161 in Aurach towards Oberaurach and follow the signs for the Wildpark . Approx. 200 animals living at 1,100 m above sea level in Tyrol's largest outdoor enclosure on 40 hectares. On the tour you will encounter deer, lynx, wild boar, yak, zebu, marmots, wild ducks, pheasants, peacocks, ibex etc. in enclosures or in the wild."});
            mainText.insert({name: "Kitzbuel", pid: 66, text: "Wildlife feeding is daily at 14.30hr (except during the mating season)", plen: "70", markedText: "Wildlife feeding is daily at 14.30hr (except during the mating season)"});
            mainText.insert({name: "Kitzbuel", pid: 67, text: "Most of the different games or play stations for children are associated with an animal species in the game park. Around the mascot, Willy the wild boar ', our youngest test their skills and sometimes try to copy the playful characteristics or patterns of behaviour of animals. Information panels, they can also learn interesting facts about the wildlife park residents: no fear of heights as a steinbock, strong as a Yak, lord it like a deer, jump like a kangaroo, crafty as the peacock. Willi the wild boar and his friends are looking forward to meeting you and hope we will be able to welcome you soon in the wild game park Aurach Wildlife Park!", plen: "648", markedText: "Most of the different games or play stations for children are associated with an animal species in the game park. Around the mascot, Willy the wild boar ', our youngest test their skills and sometimes try to copy the playful characteristics or patterns of behaviour of animals. Information panels, they can also learn interesting facts about the wildlife park residents: no fear of heights as a steinbock, strong as a Yak, lord it like a deer, jump like a kangaroo, crafty as the peacock. Willi the wild boar and his friends are looking forward to meeting you and hope we will be able to welcome you soon in the wild game park Aurach Wildlife Park!"});
            mainText.insert({name: "Kitzbuel", pid: 68, text: "Adults EUR 8.00, with guest card of Kitzbuehel Tourism EUR 7.00.", plen: "64", markedText: "Adults EUR 8.00, with guest card of Kitzbuehel Tourism EUR 7.00."});
            mainText.insert({name: "Kitzbuel", pid: 69, text: "Children from, 6-14 years EUR 5.00", plen: "34", markedText: "Children from, 6-14 years EUR 5.00"});
            mainText.insert({name: "Kitzbuel", pid: 70, text: "Groups (from 20 persons) - reduction", plen: "36", markedText: "Groups (from 20 persons) - reduction"});
            mainText.insert({name: "Kitzbuel", pid: 71, text: "To get to Aurack Wildlife Park you can use Wildparkshuttle. Daily at 13.30 hr from the Hahnenkamm Carpark, back at 16.00 hr. Prices: EUR 14.00 Ad. and EUR 7.00 Children (incl. entry)", plen: "182", markedText: "To get to Aurack Wildlife Park you can use Wildparkshuttle. Daily at 13.30 hr from the Hahnenkamm Carpark, back at 16.00 hr. Prices: EUR 14.00 Ad. and EUR 7.00 Children (incl. entry)"});
            mainText.insert({name: "Kitzbuel", pid: 72, text: "The snow sure Kitzbuehel ski area is undoubtedly one of the most popular ski resorts in the world. 54 cable cars and lifts allow the 179 km of prepared slopes and the grandiose Freeride opportunity to be enjoyed to the full. With 180 days of snow security and in particular, the world-famous, 'Streif', welcome to the “best ski resort in the world”!", plen: "349", markedText: "The snow sure Kitzbuehel ski area is undoubtedly one of the most popular ski resorts in the world. 54 cable cars and lifts allow the 179 km of prepared slopes and the grandiose Freeride opportunity to be enjoyed to the full. With 180 days of snow security and in particular, the world-famous, 'Streif', welcome to the “best ski resort in the world”!"});
            mainText.insert({name: "Kitzbuel", pid: 73, text: "179 km of perfectly groomed slopes with varying degrees of difficulty, 36 km of ski trails, plus 56 romantic ski huts and lodges: this is the Kitzbuehel ski area. There are 54 cable cars and ski lifts, operated by the Kitzbuehel Lift Company, the Bergbahn AG Kitzbuehel, which is the largest cable car company in Austria. 2013, 2014 and 2015 Kitzbuehel was voted “best ski resort in the world”, by Skiresort.de, the world's largest test portal for ski resorts. The ski area has been extensively tested across 18 categories.", plen: "523", markedText: "179 km of perfectly groomed slopes with varying degrees of difficulty, 36 km of ski trails, plus 56 romantic ski huts and lodges: this is the Kitzbuehel ski area. There are 54 cable cars and ski lifts, operated by the Kitzbuehel Lift Company, the Bergbahn AG Kitzbuehel, which is the largest cable car company in Austria. 2013, 2014 and 2015 Kitzbuehel was voted “best ski resort in the world”, by Skiresort.de, the world's largest test portal for ski resorts. The ski area has been extensively tested across 18 categories."});
            mainText.insert({name: "Kitzbuel", pid: 74, text: "In Kitzbuehel, Freeriders will find an almost endless ski area. The easily accessible backcountry extends over the provinces of Tyrol and Salzburg and for decades has been a tip for deep snow and has many firm friends. Please respect the forest and wildlife sanctuaries!", plen: "270", markedText: "In Kitzbuehel, Freeriders will find an almost endless ski area. The easily accessible backcountry extends over the provinces of Tyrol and Salzburg and for decades has been a tip for deep snow and has many firm friends. Please respect the forest and wildlife sanctuaries!"});
            mainText.insert({name: "Kitzbuel", pid: 75, text: "On March 15th, 1893, ski pioneer Franz Reisch made the first successful descent from the Kitzbuehel Horn, back down to the valley and this became the first alpine ski run in Austria. Don’t forget that piste preparation did not exist back then! In the first issue of the magazine, 'The snowshoe', dating back to November 1st, 1893, he described his experiences and thus provides the first alpine ski text, with photographs from the early days of skiing in Kitzbuehelprovided by Josef Herold.", plen: "490", markedText: "On March 15th, 1893, ski pioneer Franz Reisch made the first successful descent from the Kitzbuehel Horn, back down to the valley and this became the first alpine ski run in Austria. Don’t forget that piste preparation did not exist back then! In the first issue of the magazine, 'The snowshoe', dating back to November 1st, 1893, he described his experiences and thus provides the first alpine ski text, with photographs from the early days of skiing in Kitzbuehelprovided by Josef Herold."});
            mainText.insert({name: "Kitzbuel", pid: 76, text: "Some years later, in 1926, the Kitzbuehel Ski School was founded and it was under the direction of Karl Koller, between 1950 and 1975 that it became world famous. 'The Red Devils', as the instructors became known, always had a talent for skiing and in order to revive the, 'January hole', after Christmas and the New Year, the fronds weeks were launched and made the off-piste skiing in Kitzbuehel world famous.", plen: "411", markedText: "Some years later, in 1926, the Kitzbuehel Ski School was founded and it was under the direction of Karl Koller, between 1950 and 1975 that it became world famous. 'The Red Devils', as the instructors became known, always had a talent for skiing and in order to revive the, 'January hole', after Christmas and the New Year, the fronds weeks were launched and made the off-piste skiing in Kitzbuehel world famous."});
            mainText.insert({name: "Kitzbuel", pid: 77, text: "When Freeride professional Axel Naglich is interviewed and is asked about his favourite ski resort, it is not just for patriotic reasons that he talks about Kitzbuehel. A born and bred Tyrolean, Axel indeed grew up here and he knows the slopes like the back of his hand, but above all he knows about the superb conditions found on and around the Kitzbuehel Horn and the Hahnenkamm.", plen: "381", markedText: "When Freeride professional Axel Naglich is interviewed and is asked about his favourite ski resort, it is not just for patriotic reasons that he talks about Kitzbuehel. A born and bred Tyrolean, Axel indeed grew up here and he knows the slopes like the back of his hand, but above all he knows about the superb conditions found on and around the Kitzbuehel Horn and the Hahnenkamm."});
            mainText.insert({name: "Kitzbuel", pid: 78, text: "Thanks to the North West storage location on the Alpine Ridge, great conditions can be found in Kitzbuehel from the end of November, with an average of 8ft, or 2.4m of snow, or in other words, deep powder snow as far as the eye can see! Kitzbuehel is particularly privileged during snowfall because there are so many slopes with deep snow that are below the tree line and these slopes can be perfectly negotiated even in less than optimal weather conditions. Wide powder fields, narrow gullies and spectacular cliff drops all lie in wait for all those who love the untracked slopes and the sporting challenge of unprepared routes.", plen: "630", markedText: "Thanks to the North West storage location on the Alpine Ridge, great conditions can be found in Kitzbuehel from the end of November, with an average of 8ft, or 2.4m of snow, or in other words, deep powder snow as far as the eye can see! Kitzbuehel is particularly privileged during snowfall because there are so many slopes with deep snow that are below the tree line and these slopes can be perfectly negotiated even in less than optimal weather conditions. Wide powder fields, narrow gullies and spectacular cliff drops all lie in wait for all those who love the untracked slopes and the sporting challenge of unprepared routes."});
            mainText.insert({name: "Kitzbuel", pid: 79, text: "In Kitzbuehel, Freeriders will find countless deep snow runs. The easily accessible backcountry stretches across an area of over 200 km2. With this in mind, Kitzbuehel is positioned as off-piste paradise.", plen: "204", markedText: "In Kitzbuehel, Freeriders will find countless deep snow runs. The easily accessible backcountry stretches across an area of over 200 km2. With this in mind, Kitzbuehel is positioned as off-piste paradise."});
            mainText.insert({name: "Kitzbuel", pid: 80, text: "Regardless of ability, beginner or expert, backcountry skiers and snowboarders will find the perfect guide in one of our prestigious ski schools in and around Kitzbuehel. Extravagant nature experiences, ingenious forms of terrain and hidden, deep snow descents are guaranteed to makes the hearts of Freeriders flutter. Our experienced guides will take you skilfully and safely to pristine slopes and guarantee world class Freeride experiences. Book your private Freeride tutor to ensure a memorable time in the course of your choice! ", plen: "534", markedText: "Regardless of ability, beginner or expert, backcountry skiers and snowboarders will find the perfect guide in one of our prestigious ski schools in and around Kitzbuehel. Extravagant nature experiences, ingenious forms of terrain and hidden, deep snow descents are guaranteed to makes the hearts of Freeriders flutter. Our experienced guides will take you skilfully and safely to pristine slopes and guarantee world class Freeride experiences. Book your private Freeride tutor to ensure a memorable time in the course of your choice! "});
            mainText.insert({name: "Kitzbuel", pid: 81, text: "The Streif is the most spectacular downhill ski race track in the world. It brings the best skiers from every corner of the world together in an almost gladiator style fight for the honour of victory on the Streif. During the winter, before and after the race, the Streif is a public ski area and one can tackle the racecourse or the easier Family Streif, which offers two alternative gradients.", plen: "395", markedText: "The Streif is the most spectacular downhill ski race track in the world. It brings the best skiers from every corner of the world together in an almost gladiator style fight for the honour of victory on the Streif. During the winter, before and after the race, the Streif is a public ski area and one can tackle the racecourse or the easier Family Streif, which offers two alternative gradients."});
            mainText.insert({name: "Kitzbuel", pid: 82, text: "In downhill ski racing, the Streif, is regarded as the ultimate challenge because of the diversity of its terrain. All the elements of a classic downhill course can be found on the Streif, high speed breathtaking jumps, steep slopes, flat out gliding sections, curves, compressions, spectacular bumps and even a short uphill section just before the Seidlalm jump. The Streif has it all.", plen: "386", markedText: "In downhill ski racing, the Streif, is regarded as the ultimate challenge because of the diversity of its terrain. All the elements of a classic downhill course can be found on the Streif, high speed breathtaking jumps, steep slopes, flat out gliding sections, curves, compressions, spectacular bumps and even a short uphill section just before the Seidlalm jump. The Streif has it all."});
            mainText.insert({name: "Kitzbuel", pid: 83, text: "The Streif can be tackled in winter by most intermediate skiers. The start house is opposite the summit station of the Hahnenkamm cable car. The famous sections such as the Mausefalle, Steilhang and Hausbergkante, are marked as “extreme ski routes” and are often in very icy condition. These sections are for expert skiers only.", plen: "328", markedText: "The Streif can be tackled in winter by most intermediate skiers. The start house is opposite the summit station of the Hahnenkamm cable car. The famous sections such as the Mausefalle, Steilhang and Hausbergkante, are marked as “extreme ski routes” and are often in very icy condition. These sections are for expert skiers only."});
            mainText.insert({name: "Kitzbuel", pid: 84, text: "The Family Streif is a special highlight for skiers and snowboarders. The extreme sections of the racecourse can be missed out giving the opportunity to negotiate the other sections of the racecourse on the descent back to the town, by following the “Red 21” on the Kitzbuehel ski map.", plen: "285", markedText: "The Family Streif is a special highlight for skiers and snowboarders. The extreme sections of the racecourse can be missed out giving the opportunity to negotiate the other sections of the racecourse on the descent back to the town, by following the “Red 21” on the Kitzbuehel ski map."});
            mainText.insert({name: "Kitzbuel", pid: 85, text: "In the summer of 2010, alterations were made to the Streif, including the introduction of a section from the exit of the Steilhang to the ridge before the Seidlalm that runs parallel to the racecourse but higher up the mountain. This has made it possible to ski next to the Streif during the preparation work in January and during the race weekend. Other key areas are still closed from around January 6th onwards for necessary race preparation but disruption is kept to a minimum.", plen: "481", markedText: "In the summer of 2010, alterations were made to the Streif, including the introduction of a section from the exit of the Steilhang to the ridge before the Seidlalm that runs parallel to the racecourse but higher up the mountain. This has made it possible to ski next to the Streif during the preparation work in January and during the race weekend. Other key areas are still closed from around January 6th onwards for necessary race preparation but disruption is kept to a minimum."});
            mainText.insert({name: "Kitzbuel", pid: 86, text: "Weeks of work are required to prepare the course for the race. Snow must be transported to the right places and the terrain has to be corrected if necessary with additional snow. The entire track is then prepared, frozen and solidified, with safety and security fencing, provisions for television coverage, a public address system and other related work to allow the race to take place.", plen: "386", markedText: "Weeks of work are required to prepare the course for the race. Snow must be transported to the right places and the terrain has to be corrected if necessary with additional snow. The entire track is then prepared, frozen and solidified, with safety and security fencing, provisions for television coverage, a public address system and other related work to allow the race to take place."});
            mainText.insert({name: "Kitzbuel", pid: 87, text: "The world famous Downhill course is named after the Streifalm, the meadow on the upper part of the course. In turn, the pasture was probably named after a farmer named Brixner “Straiff”. The Mausefalle jump was baptised by Toni Sailer Senior, father of the skiing superstar, because the section in question reminded him of an old wire mousetrap. Just like a mouse within the wire case, the downhill racers make their way down this steep slope following the jump. The Mausefalle has been in use since the early 1950’s.", plen: "517", markedText: "The world famous Downhill course is named after the Streifalm, the meadow on the upper part of the course. In turn, the pasture was probably named after a farmer named Brixner “Straiff”. The Mausefalle jump was baptised by Toni Sailer Senior, father of the skiing superstar, because the section in question reminded him of an old wire mousetrap. Just like a mouse within the wire case, the downhill racers make their way down this steep slope following the jump. The Mausefalle has been in use since the early 1950’s."});
            mainText.insert({name: "Kitzbuel", pid: 88, text: "n Kitzbuehel an average of 180 days of skiing is possible each season (please see graphic below). The Gamsstadt underlines its reputation as a snow sure winter fortress. In recent years, Kitzbuehel has been the first non glacial ski area in Austria to open for the winter season. In winter 2012/13 the number of possible ski days was 182, and that extended from November 1st, 2012 to May 1st, 2013, this was a new record in the 87 year history of the Kitzbuehel Lift Company, the Bergbahn AG Kitzbuehel.", plen: "503", markedText: "n Kitzbuehel an average of 180 days of skiing is possible each season (please see graphic below). The Gamsstadt underlines its reputation as a snow sure winter fortress. In recent years, Kitzbuehel has been the first non glacial ski area in Austria to open for the winter season. In winter 2012/13 the number of possible ski days was 182, and that extended from November 1st, 2012 to May 1st, 2013, this was a new record in the 87 year history of the Kitzbuehel Lift Company, the Bergbahn AG Kitzbuehel."});
            mainText.insert({name: "Kitzbuel", pid: 89, text: "The stars from the Austrian ski team are repeatedly drawn to Kitzbuehel in order to hone their skills in training camps held on its slopes. Particularly popular at the beginning of the season is the snow sure Resterkogel in Pass Thurn. This is where the Austrians always go in October, setting up the gates for slalom training. The Ganslernhang, in Kitzbuehel, is used repeatedly by various national teams for training throughout the season.", plen: "441", markedText: "The stars from the Austrian ski team are repeatedly drawn to Kitzbuehel in order to hone their skills in training camps held on its slopes. Particularly popular at the beginning of the season is the snow sure Resterkogel in Pass Thurn. This is where the Austrians always go in October, setting up the gates for slalom training. The Ganslernhang, in Kitzbuehel, is used repeatedly by various national teams for training throughout the season."});
            mainText.insert({name: "Kitzbuel", pid: 90, text: "The connection between Kitzbuehel and skiing is legendary. In March 1893, Franz Reisch managed to ski down from the Kitzbueheler Horn, making it the first Alpine ski run in Austria. No other ski resort in the Alps has such a long and successful tradition, history or association with skiing. In 1956 after winning three gold medals at the Winter Olympic Games and with his charisma and skiing prowess, Toni Sailer became the first global media star in winter sports.", plen: "466", markedText: "The connection between Kitzbuehel and skiing is legendary. In March 1893, Franz Reisch managed to ski down from the Kitzbueheler Horn, making it the first Alpine ski run in Austria. No other ski resort in the Alps has such a long and successful tradition, history or association with skiing. In 1956 after winning three gold medals at the Winter Olympic Games and with his charisma and skiing prowess, Toni Sailer became the first global media star in winter sports."});
            mainText.insert({name: "Kitzbuel", pid: 91, text: "After making his first successful ski in the winter of 1892 – 93, it is claimed that Franz Reisch told his friend Josef Herold, “Sepp, I would have to beat it into you to prove how beautiful it was.” ", plen: "200", markedText: "After making his first successful ski in the winter of 1892 – 93, it is claimed that Franz Reisch told his friend Josef Herold, “Sepp, I would have to beat it into you to prove how beautiful it was.” "});
            mainText.insert({name: "Kitzbuel", pid: 92, text: "Reisch had read the sensational book; “On snowshoes through Greenland” by Norwegian polar explorer, Fridtjof Nansen in which the author expresses enthusiasm for Skisport and the book received worldwide attention, especially in Kitzbuehel. This book may well have been the trigger that began the unprecedented development of a sleepy mountain town into a place that is the heart and soul of skiing.", plen: "397", markedText: "Reisch had read the sensational book; “On snowshoes through Greenland” by Norwegian polar explorer, Fridtjof Nansen in which the author expresses enthusiasm for Skisport and the book received worldwide attention, especially in Kitzbuehel. This book may well have been the trigger that began the unprecedented development of a sleepy mountain town into a place that is the heart and soul of skiing."});
            mainText.insert({name: "Kitzbuel", pid: 93, text: "Franz Reisch was inspired by the accounts from the far north of Fridtjof Nansen and such was his interest, he ordered a couple of, “planks”, from Norway. At the time, many of the residents of Kitzbuehel were sceptical towards Reisch and thought he had gone crazy! However, he was undeterred and soon began to embark on bigger tours.", plen: "332", markedText: "Franz Reisch was inspired by the accounts from the far north of Fridtjof Nansen and such was his interest, he ordered a couple of, “planks”, from Norway. At the time, many of the residents of Kitzbuehel were sceptical towards Reisch and thought he had gone crazy! However, he was undeterred and soon began to embark on bigger tours."});
            mainText.insert({name: "Kitzbuel", pid: 95, text: "On March 15th 1893 after hiking to the summit of the Kitzbueheler Horn, Franz Reisch successfully skied back down to the valley and in the first issue of the magazine, “The snowshoe”, from November 1st 1893; he described what he had experienced. Josef Herold supplied photographs of the early days of skiing in Kitzbuehel and as a result, the first account of Alpine Skiing was placed on record!", plen: "395", markedText: "On March 15th 1893 after hiking to the summit of the Kitzbueheler Horn, Franz Reisch successfully skied back down to the valley and in the first issue of the magazine, “The snowshoe”, from November 1st 1893; he described what he had experienced. Josef Herold supplied photographs of the early days of skiing in Kitzbuehel and as a result, the first account of Alpine Skiing was placed on record!"});
            mainText.insert({name: "Kitzbuel", pid: 97, text: "Franz Reisch quickly discovered that there like minded people with similar aspirations who also wanted to undertake skiing trips. Together they organised and held regular ski races throughout 1895 and the development of winter tourism soon followed. Such was the demand, the opening of hotels and leased apartments began, and the first commercial ski lessons became available.", plen: "376", markedText: "Franz Reisch quickly discovered that there like minded people with similar aspirations who also wanted to undertake skiing trips. Together they organised and held regular ski races throughout 1895 and the development of winter tourism soon followed. Such was the demand, the opening of hotels and leased apartments began, and the first commercial ski lessons became available."});
            mainText.insert({name: "Kitzbuel", pid: 98, text: "In 1902 the Kitzbuehel Ski Association was founded and was renamed 'Kitzbuehel Ski Club (KSC)' in 1931. The K.S.C. is one of the most famous ski clubs in the world with more than 6,500 members from 30 countries. The club is extremely proud of its heritage and the success of its athletes. Since 1902, members of the club have won a total of 51 Olympic and World Championship medals.", plen: "382", markedText: "In 1902 the Kitzbuehel Ski Association was founded and was renamed 'Kitzbuehel Ski Club (KSC)' in 1931. The K.S.C. is one of the most famous ski clubs in the world with more than 6,500 members from 30 countries. The club is extremely proud of its heritage and the success of its athletes. Since 1902, members of the club have won a total of 51 Olympic and World Championship medals."});
            mainText.insert({name: "Kitzbuel", pid: 100, text: "The main tasks of the K.S.C. are the organization of the Hahnenkamm races and the development and promotion of youth in all disciplines of skiing and snowsports, such as, alpine skiing, biathlon, cross country skiing, freestyle skiing, Nordic combined, ski cross, snowboarding and ski jumping. The current President of the club is Dr. Michael Huber who has held the role since 2010.", plen: "382", markedText: "The main tasks of the K.S.C. are the organization of the Hahnenkamm races and the development and promotion of youth in all disciplines of skiing and snowsports, such as, alpine skiing, biathlon, cross country skiing, freestyle skiing, Nordic combined, ski cross, snowboarding and ski jumping. The current President of the club is Dr. Michael Huber who has held the role since 2010."});
            mainText.insert({name: "Kitzbuel", pid: 101, text: "In 1926 the Kitzbuehel Ski School was founded and it became world famous under the leadership of Karl Koller who ran the ski school between 1950 and 1975. Koller was somewhat of a marketing genius and worked with the artist Alfons Walde, to produce modern posters to promote the 'Red Devils”. The, “Red Devils” nickname was a reference to the red sweaters and hats that the ski instructors wore. Always an entrepreneur, Koller introduced and created the, 'PotSki School', in which all of the instructors involved received a share of the profits.", plen: "545", markedText: "In 1926 the Kitzbuehel Ski School was founded and it became world famous under the leadership of Karl Koller who ran the ski school between 1950 and 1975. Koller was somewhat of a marketing genius and worked with the artist Alfons Walde, to produce modern posters to promote the 'Red Devils”. The, “Red Devils” nickname was a reference to the red sweaters and hats that the ski instructors wore. Always an entrepreneur, Koller introduced and created the, 'PotSki School', in which all of the instructors involved received a share of the profits."});
            mainText.insert({name: "Kitzbuel", pid: 102, text: "Karl Koller also developed “Ski Peadagoge” and became great friends with the 'Ski-Pope' Stefan Kruckenhauser who revolutionized ski teaching. He introduced short ski teaching methods without ‘Stemmbewegungen’ (knee turns) and brought in, play to learn for Ski kids in the 'Children's World', published Ski videos and textbooks and changed many other things. The ski methods used in Kitzbuehel spread to ski resorts all over the world and the ski instructors who helped spread the gospel played a leading part in making it such a popular sport in the USA.", plen: "554", markedText: "Karl Koller also developed “Ski Peadagoge” and became great friends with the 'Ski-Pope' Stefan Kruckenhauser who revolutionized ski teaching. He introduced short ski teaching methods without ‘Stemmbewegungen’ (knee turns) and brought in, play to learn for Ski kids in the 'Children's World', published Ski videos and textbooks and changed many other things. The ski methods used in Kitzbuehel spread to ski resorts all over the world and the ski instructors who helped spread the gospel played a leading part in making it such a popular sport in the USA."});
            mainText.insert({name: "Kitzbuel", pid: 103, text: "March 1931 saw the first running of the Hahnenkamm Downhill Ski Race in Kitzbuehel. After World War II was over, the race was held on a variety of different slopes and it became increasingly important race. Towards the end of the 1940s came the idea of combining the “Streif” and the “Ganslernhang” pistes to form a new route for the race, forming the basis of what we know as the Hahnenkamm race today. Since its inception, the race has evolved and has become the most important and prestigious ski race in the world.", plen: "518", markedText: "March 1931 saw the first running of the Hahnenkamm Downhill Ski Race in Kitzbuehel. After World War II was over, the race was held on a variety of different slopes and it became increasingly important race. Towards the end of the 1940s came the idea of combining the “Streif” and the “Ganslernhang” pistes to form a new route for the race, forming the basis of what we know as the Hahnenkamm race today. Since its inception, the race has evolved and has become the most important and prestigious ski race in the world."});
            mainText.insert({name: "Kitzbuel", pid: 104, text: "The legendary “Ski Wonder Team” plays a legendary role in the history of Kitzbuehel. For ten years, the best skiers in the world all come from Kitzbuehel. Toni Sailer, Ernst Hinterseer, Hias Leitner, Anderl Molterer, Fritz Huber and Christian Pravda dominated skiing between 1950 and 1960. Together this miracle team won 27 medals in the Winter Olympic Games and World Skiing Championships.", plen: "390", markedText: "The legendary “Ski Wonder Team” plays a legendary role in the history of Kitzbuehel. For ten years, the best skiers in the world all come from Kitzbuehel. Toni Sailer, Ernst Hinterseer, Hias Leitner, Anderl Molterer, Fritz Huber and Christian Pravda dominated skiing between 1950 and 1960. Together this miracle team won 27 medals in the Winter Olympic Games and World Skiing Championships."});
            mainText.insert({name: "Kitzbuel", pid: 105, text: "With his success in skiing, natural charm and charisma, Toni Sailer became the first global media star in winter sports. He and his “Kitzbuehel Wonder Ski Team” dominated the ski world for a decade. He won 3 Olympic gold medals, 7 World Championship medals and won races on all the classic ski pistes in the world. These are the sporting achievements of Toni Sailer but Toni Sailer was more – he was a legend in his own lifetime. He achieved so much and remarkably was only 22 years old when he ended his professional skiing career. Once, on a visit to Tokyo, he was welcomed by Crown Prince Akihito and 250,000 delirious fans at the airport.", plen: "642", markedText: "With his success in skiing, natural charm and charisma, Toni Sailer became the first global media star in winter sports. He and his “Kitzbuehel Wonder Ski Team” dominated the ski world for a decade. He won 3 Olympic gold medals, 7 World Championship medals and won races on all the classic ski pistes in the world. These are the sporting achievements of Toni Sailer but Toni Sailer was more – he was a legend in his own lifetime. He achieved so much and remarkably was only 22 years old when he ended his professional skiing career. Once, on a visit to Tokyo, he was welcomed by Crown Prince Akihito and 250,000 delirious fans at the airport."});
            mainText.insert({name: "Kitzbuel", pid: 107, text: "Toni Sailer was became the symbol of reconstruction in the post-war Austria and an icon for a whole nation. The three Olympic gold medals and four world championship titles he won at the 1956 Winter Olympic Games in Cortina d’Ampezzo, Italy, were the highlights of his extraordinary career.", plen: "290", markedText: "Toni Sailer was became the symbol of reconstruction in the post-war Austria and an icon for a whole nation. The three Olympic gold medals and four world championship titles he won at the 1956 Winter Olympic Games in Cortina d’Ampezzo, Italy, were the highlights of his extraordinary career."});
            mainText.insert({name: "Kitzbuel", pid: 108, text: "The 3S gondola is a technical masterpiece in aerial ropeway engineering. It connects the two ski areas of Kitzbuehel / Kirchberg and Jochberg / Resterhoehe. When it was opened in January 2005, the, “3S”, broke two world records. The first record was the maximum height above ground of 400 metres and the second record was having the longest span of any aerial cable car of 2507 metres. The, “3S”, travels the exceptional distance of 2507 metres between the Jochberg station and the single 80 metre high support pillar over a total distance of 3600 metres.", plen: "555", markedText: "The 3S gondola is a technical masterpiece in aerial ropeway engineering. It connects the two ski areas of Kitzbuehel / Kirchberg and Jochberg / Resterhoehe. When it was opened in January 2005, the, “3S”, broke two world records. The first record was the maximum height above ground of 400 metres and the second record was having the longest span of any aerial cable car of 2507 metres. The, “3S”, travels the exceptional distance of 2507 metres between the Jochberg station and the single 80 metre high support pillar over a total distance of 3600 metres."});
            mainText.insert({name: "Kitzbuel", pid: 109, text: "In the last few years, Axel Naglich and the late Peter Ressman from Kitzbuehel have climbed up the highest mountains and become the first people to ski some of most extreme downhill routes in the world. Axel was at the foot of the Nuptse in the Himalayas and skied from the top highest mountain in Europe, the Elbrus, in the south of Russia. He travelled for years through South America, across the Middle East and along the way left his tracks on Damavand in Iran.", plen: "465", markedText: "In the last few years, Axel Naglich and the late Peter Ressman from Kitzbuehel have climbed up the highest mountains and become the first people to ski some of most extreme downhill routes in the world. Axel was at the foot of the Nuptse in the Himalayas and skied from the top highest mountain in Europe, the Elbrus, in the south of Russia. He travelled for years through South America, across the Middle East and along the way left his tracks on Damavand in Iran."});
            mainText.insert({name: "Kitzbuel", pid: 110, text: "Axel Naglich loves a challenge. He has three wins at the 24- hour-race in Aspen, 11 years experience as a forerunner on the Streif at the Hahnenkamm downhill race and became the first man to ski the longest downhill in the world at Mount St.Elias in Alaska, 5489 metres above sea level. To put it into context, the highest mountain on earth is Mount Everest at 8848 metres above sea level; however, it only protrudes approximately 3500 metres from the Tibetan Plateau. These are just a few milestones in his career of Axel Naglich", plen: "530", markedText: "Axel Naglich loves a challenge. He has three wins at the 24- hour-race in Aspen, 11 years experience as a forerunner on the Streif at the Hahnenkamm downhill race and became the first man to ski the longest downhill in the world at Mount St.Elias in Alaska, 5489 metres above sea level. To put it into context, the highest mountain on earth is Mount Everest at 8848 metres above sea level; however, it only protrudes approximately 3500 metres from the Tibetan Plateau. These are just a few milestones in his career of Axel Naglich"});
            mainText.insert({name: "Kitzbuel", pid: 112, text: "David Kreiner was crowned Olympic Champion on February 23rd, 2010 in Vancouver. Together with his team mates, Felix Gottwald, Mario Stecher and Bernhard Gruber, he won the team event at the Nordic combined at the 21stWinter Olympic Games. David won the first Olympic gold for Austria since Ernst Hinterseer in 1960 at Squaw Valley.", plen: "331", markedText: "David Kreiner was crowned Olympic Champion on February 23rd, 2010 in Vancouver. Together with his team mates, Felix Gottwald, Mario Stecher and Bernhard Gruber, he won the team event at the Nordic combined at the 21stWinter Olympic Games. David won the first Olympic gold for Austria since Ernst Hinterseer in 1960 at Squaw Valley."});
            mainText.insert({name: "Kitzbuel", pid: 113, text: "In 2011, Kreiner was successful with the Nordic combined team. At the World Championships in Oslo, he and his team mates Felix Gottwald, Mario Stecher and Bernhard Gruber secured their second world championship title in the team competition", plen: "240", markedText: "In 2011, Kreiner was successful with the Nordic combined team. At the World Championships in Oslo, he and his team mates Felix Gottwald, Mario Stecher and Bernhard Gruber secured their second world championship title in the team competition"});
            mainText.insert({name: "Kitzbuel", pid: 114, text: "The rolling hills of Kitzbuehel provide ideal ski touring terrain. The mountain pastures and grass vegetation grow up to the summit of each mountain meaning perfect snow conditions can enjoyed with a snow depth of just 50cm. Ski touring enthusiasts will appreciate the good visibility and relatively low alpine dangers of the Kitzbuehel Alps.", plen: "342", markedText: "The rolling hills of Kitzbuehel provide ideal ski touring terrain. The mountain pastures and grass vegetation grow up to the summit of each mountain meaning perfect snow conditions can enjoyed with a snow depth of just 50cm. Ski touring enthusiasts will appreciate the good visibility and relatively low alpine dangers of the Kitzbuehel Alps."});
            mainText.insert({name: "Kitzbuel", pid: 116, text: "The Kitzbuehel Alps offer numerous opportunities for ski touring. With an efficient lift system, little effort is required to reach largely untouched peaks and valleys just a few hundred meters above sea level. Alternatively, if you are fit enough, you can reach these areas without the help of lifts and the vast area offers plenty of room for individual mountain experiences.", plen: "377", markedText: "The Kitzbuehel Alps offer numerous opportunities for ski touring. With an efficient lift system, little effort is required to reach largely untouched peaks and valleys just a few hundred meters above sea level. Alternatively, if you are fit enough, you can reach these areas without the help of lifts and the vast area offers plenty of room for individual mountain experiences."});
            mainText.insert({name: "Kitzbuel", pid: 118, text: "The ski schools of Kitzbuehel ensure that their certified mountain and ski guides will take you safely to the highest peaks and to the slopes with the deepest snow around.", plen: "171", markedText: "The ski schools of Kitzbuehel ensure that their certified mountain and ski guides will take you safely to the highest peaks and to the slopes with the deepest snow around."});
            mainText.insert({name: "Kitzbuel", pid: 119, text: "Please note that before every trip, put safety first and check the recommendations of the avalanche forecast of Tyrol and the Salzburg GPS-based ski touring suggestions. Please see our newly designed interactive platform 'Kitz tours' for new and exciting tours.", plen: "261", markedText: "Please note that before every trip, put safety first and check the recommendations of the avalanche forecast of Tyrol and the Salzburg GPS-based ski touring suggestions. Please see our newly designed interactive platform 'Kitz tours' for new and exciting tours."});
            mainText.insert({name: "Kitzbuel", pid: 120, text: "The area below the Stuckkogel is a mountain paradise, especially at night. All the other ski pistes are usually closed after normal ski times and for most people, the rise and descent on a groomed slope is a luxury that you would not want to miss.", plen: "247", markedText: "The area below the Stuckkogel is a mountain paradise, especially at night. All the other ski pistes are usually closed after normal ski times and for most people, the rise and descent on a groomed slope is a luxury that you would not want to miss."});
            mainText.insert({name: "Kitzbuel", pid: 121, text: "For a free and exclusive sporting tour in search of the perfect slopes, touring and skiers have the opportunity to ride with a chauffeur directly to a groomed slope, taking about 8 people at a time.", plen: "198", markedText: "For a free and exclusive sporting tour in search of the perfect slopes, touring and skiers have the opportunity to ride with a chauffeur directly to a groomed slope, taking about 8 people at a time."});
            mainText.insert({name: "Kitzbuel", pid: 122, text: "The “Streif”, one of the most spectacular downhill pistes in the world, is usually closed in the evening for piste preparation work. Alternatively, ski tours can be made on the Asten piste, marked number 20 on the Kitzbuehel ski map.The departure is available daily up to 24.00 hours for tourers during the winter months.", plen: "321", markedText: "The “Streif”, one of the most spectacular downhill pistes in the world, is usually closed in the evening for piste preparation work. Alternatively, ski tours can be made on the Asten piste, marked number 20 on the Kitzbuehel ski map.The departure is available daily up to 24.00 hours for tourers during the winter months."});
            mainText.insert({name: "Kitzbuel", pid: 123, text: "Normally the, “Piste Basher” drivers work intensively at night to prepare the slopes for the next day and ski touring enthusiasts need to take the piste preparation work into consideration. However, when only a few groomers are in use a window of opportunity for risk free tours exists. It is still important to take care, look out for and keep away from the dangerous rope winches used by the preparation machines that are not always in view!", plen: "443", markedText: "Normally the, “Piste Basher” drivers work intensively at night to prepare the slopes for the next day and ski touring enthusiasts need to take the piste preparation work into consideration. However, when only a few groomers are in use a window of opportunity for risk free tours exists. It is still important to take care, look out for and keep away from the dangerous rope winches used by the preparation machines that are not always in view!"});
            mainText.insert({name: "Kitzbuel", pid: 125, text: "On a Friday evening, the Hahnenkamm cable car operates until 23:00 hours and both the Hocheckhuette and the Hochkitzbuehel mountain restaurants are open late. This allows those making a Friday night tour the opportunity to enjoy some well earned refreshments at the summit. Furthermore, it allows the opportunity to meet up with friends, and should the need arise, there is the option of taking the cable car back to Kitzbuehel valley.", plen: "435", markedText: "On a Friday evening, the Hahnenkamm cable car operates until 23:00 hours and both the Hocheckhuette and the Hochkitzbuehel mountain restaurants are open late. This allows those making a Friday night tour the opportunity to enjoy some well earned refreshments at the summit. Furthermore, it allows the opportunity to meet up with friends, and should the need arise, there is the option of taking the cable car back to Kitzbuehel valley."});
            mainText.insert({name: "Kitzbuel", pid: 126, text: "Cross-country skiing introduces you to the peaceful side of Kitzbuehel. More than 60 km of groomed trails for classic and skating cross-country enthusiasts are available and offer a very special winter enjoyment.There is an illuminated Snow Sports Trail at the Golfclub Kitzbuehel-Schwarzsee-Reith and a unique altitude track high up at Pass Thurn.", plen: "348", markedText: "Cross-country skiing introduces you to the peaceful side of Kitzbuehel. More than 60 km of groomed trails for classic and skating cross-country enthusiasts are available and offer a very special winter enjoyment.There is an illuminated Snow Sports Trail at the Golfclub Kitzbuehel-Schwarzsee-Reith and a unique altitude track high up at Pass Thurn."});
            mainText.insert({name: "Kitzbuel", pid: 127, text: "Trails around Kitzbuehel go to the Wilder Kaiser mountain range, the Brixen Valley and up to Pass Thurn with over 500 km of groomed trails. Most are easy to ski and do not have steep climbs and descents. There are also numerous charming guesthouses in the region to sit back and take a break during your cross-country skiing.", plen: "325", markedText: "Trails around Kitzbuehel go to the Wilder Kaiser mountain range, the Brixen Valley and up to Pass Thurn with over 500 km of groomed trails. Most are easy to ski and do not have steep climbs and descents. There are also numerous charming guesthouses in the region to sit back and take a break during your cross-country skiing."});
            mainText.insert({name: "Kitzbuel", pid: 128, text: "The Golfclub Kitzbuehel-Schwarzsee-Reith with its snowy and floodlit trails is the specialty of the cross-country flagship Kitzbuehel. Sporting or hobby cross-coutry skiers come from near and far to hone their fitness and technique there. Even the professional local skier David Kreiner (Austria National Team in Nordic Combined) uses the high-class facilities.At the golf club, next to the 7.0-km loop, are also some shorter, but varied versions. From dusk until 21.30hr, 3.3 km of trails are lit up and can be used for evening training. This 3.3-km-variant, with artificial snow, is run in collaboration with the Kitzbuehel Ski Club (KSC) and is therefore extremely snow-secure.", plen: "680", markedText: "The Golfclub Kitzbuehel-Schwarzsee-Reith with its snowy and floodlit trails is the specialty of the cross-country flagship Kitzbuehel. Sporting or hobby cross-coutry skiers come from near and far to hone their fitness and technique there. Even the professional local skier David Kreiner (Austria National Team in Nordic Combined) uses the high-class facilities.At the golf club, next to the 7.0-km loop, are also some shorter, but varied versions. From dusk until 21.30hr, 3.3 km of trails are lit up and can be used for evening training. This 3.3-km-variant, with artificial snow, is run in collaboration with the Kitzbuehel Ski Club (KSC) and is therefore extremely snow-secure."});
            mainText.insert({name: "Kitzbuel", pid: 129, text: "The wonderful high trail at Pass Thurn (1.274m above sea level) offers maximum snow. Trails are groomed for skate and classic from December to April. The High Trail Pass Thurn is easily accessible by car or bus.", plen: "211", markedText: "The wonderful high trail at Pass Thurn (1.274m above sea level) offers maximum snow. Trails are groomed for skate and classic from December to April. The High Trail Pass Thurn is easily accessible by car or bus."});
            mainText.insert({name: "Kitzbuel", pid: 130, text: "A scenic and also snow-sure ski run is Aschau bei Kirchberg (1.020m above sea level). This trail is useable normally from December to April for classic and skating. You can park in front of the Cafe Hochland.", plen: "208", markedText: "A scenic and also snow-sure ski run is Aschau bei Kirchberg (1.020m above sea level). This trail is useable normally from December to April for classic and skating. You can park in front of the Cafe Hochland."});
            mainText.insert({name: "Kitzbuel", pid: 131, text: "All the trails in and around Kitzbühel can be used for free.", plen: "60", markedText: "All the trails in and around Kitzbühel can be used for free."});
            mainText.insert({name: "Kitzbuel", pid: 132, text: "Winter hiking and walking is a wonderful way to explore Kitzbuehel and its surrounding villages. There are a variety of well maintained trails and paths to explore, lending a unique perspective and showing the area in a very different light.", plen: "241", markedText: "Winter hiking and walking is a wonderful way to explore Kitzbuehel and its surrounding villages. There are a variety of well maintained trails and paths to explore, lending a unique perspective and showing the area in a very different light."});
            mainText.insert({name: "Kitzbuel", pid: 133, text: "Away from the slopes, Kitzbuehel has a peaceful side and hiking through the snow-covered landscape in Kitzbuehel, Aurach, Jochberg and Reith, is relaxing and invigorating.", plen: "171", markedText: "Away from the slopes, Kitzbuehel has a peaceful side and hiking through the snow-covered landscape in Kitzbuehel, Aurach, Jochberg and Reith, is relaxing and invigorating."});
            mainText.insert({name: "Kitzbuel", pid: 134, text: "The Kitzbuehel Tourism Office offers guided hikings and snowshoe tours with one of our guides for free. Hiking through the Kitzbuehel Alps in the company of an experienced walking guide enables you to learn a great deal about the country and its people. Your personal tour book is the perfect place to write down your thoughts and make notes about your tour. After you complete a third walk, you earn your first walking badge, known locally as a 'Wandernadel'.", plen: "460", markedText: "The Kitzbuehel Tourism Office offers guided hikings and snowshoe tours with one of our guides for free. Hiking through the Kitzbuehel Alps in the company of an experienced walking guide enables you to learn a great deal about the country and its people. Your personal tour book is the perfect place to write down your thoughts and make notes about your tour. After you complete a third walk, you earn your first walking badge, known locally as a 'Wandernadel'."});
            mainText.insert({name: "Kitzbuel", pid: 136, text: "Guided winter hiking and walking tours are available from Monday to Friday throughout the season. The meeting point is at the Kitzbuehel Tourist Information Office, Hinterstadt 18, at 09:45 hours. The costs of bus or taxi journeys are not included and a lift ticket purchase may be required. However, walking poles and snowshoes are available for hire at the cost of EUR 12.", plen: "374", markedText: "Guided winter hiking and walking tours are available from Monday to Friday throughout the season. The meeting point is at the Kitzbuehel Tourist Information Office, Hinterstadt 18, at 09:45 hours. The costs of bus or taxi journeys are not included and a lift ticket purchase may be required. However, walking poles and snowshoes are available for hire at the cost of EUR 12."});
            mainText.insert({name: "Kitzbuel", pid: 137, text: "Experience an unforgettable winter day in our unique mountain scenery and try different hiking methods for a memorable adventure. Our free guided winter hikes and walks begin in early December and are then available from Monday to Friday throughout the season.", plen: "260", markedText: "Experience an unforgettable winter day in our unique mountain scenery and try different hiking methods for a memorable adventure. Our free guided winter hikes and walks begin in early December and are then available from Monday to Friday throughout the season."});
            mainText.insert({name: "Kitzbuel", pid: 138, text: "The meeting point is at the Kitzbuehel Tourism Office", plen: "53", markedText: "The meeting point is at the Kitzbuehel Tourism Office"});
            mainText.insert({name: "Kitzbuel", pid: 139, text: "One of our not to be missed guided snowshoe walks will take you to the largest reservoir in Austria! Take the Kitzbuehel Alps Panorama Lift to Resterhoehe and walk from the lift exit over to the reservoir. The walk then continues on to the Panorama Alm for a snack before returning to the starting point at the Panorama lift.", plen: "325", markedText: "One of our not to be missed guided snowshoe walks will take you to the largest reservoir in Austria! Take the Kitzbuehel Alps Panorama Lift to Resterhoehe and walk from the lift exit over to the reservoir. The walk then continues on to the Panorama Alm for a snack before returning to the starting point at the Panorama lift."});
            mainText.insert({name: "Kitzbuel", pid: 140, text: "Please register for this walk at the Kitzbuehel Tourism Office. A minimum of four people are required for the walk and it is only possible with the guest card of the Kitzbuehel Tourism Office!", plen: "192", markedText: "Please register for this walk at the Kitzbuehel Tourism Office. A minimum of four people are required for the walk and it is only possible with the guest card of the Kitzbuehel Tourism Office!"});
            mainText.insert({name: "Kitzbuel", pid: 141, text: "The Bichlalm, on the sunny side of the valley, between Kitzbuehel and Aurach, is one of the best areas in the region for hiking, ski touring or snowshoe hiking. It is the perfect place to enjoy the scenic beauty in peace!", plen: "221", markedText: "The Bichlalm, on the sunny side of the valley, between Kitzbuehel and Aurach, is one of the best areas in the region for hiking, ski touring or snowshoe hiking. It is the perfect place to enjoy the scenic beauty in peace!"});
            mainText.insert({name: "Kitzbuel", pid: 142, text: "In winter Kitzbuehel has a large variety of sports to offer. skiing, snowboarding, cross country skiing, winter hiking, ice skatingand many other activities in magnificent scenery which guarantees an unforgettable holiday.", plen: "222", markedText: "In winter Kitzbuehel has a large variety of sports to offer. skiing, snowboarding, cross country skiing, winter hiking, ice skatingand many other activities in magnificent scenery which guarantees an unforgettable holiday."});
            mainText.insert({name: "Kitzbuel", pid: 145, text: "Kitzbuehel has also after dark a lot of sporting possibilities. Every Thursday and Friday, you can try night skiing in the Kitzbuehel ski area.", plen: "143", markedText: "Kitzbuehel has also after dark a lot of sporting possibilities. Every Thursday and Friday, you can try night skiing in the Kitzbuehel ski area."});
            mainText.insert({name: "Kitzbuel", pid: 146, text: "The slopes on the famous Gaisberg in Kirchberg are well prepared and the piste glistens in the white of the floodlights decorated with the stars in night sky above. A special kind of experience; the modern floodlights illuminate the slopes into the far corners and allows you to have fun late into the night. The retreat cabins at Gaisberg are an invitation eat, drink and socialize. The lift is in operation every Thursday and Friday from 18.30hr to 21.30hr. The floodlighting is switched off at 23.00hr.", plen: "505", markedText: "The slopes on the famous Gaisberg in Kirchberg are well prepared and the piste glistens in the white of the floodlights decorated with the stars in night sky above. A special kind of experience; the modern floodlights illuminate the slopes into the far corners and allows you to have fun late into the night. The retreat cabins at Gaisberg are an invitation eat, drink and socialize. The lift is in operation every Thursday and Friday from 18.30hr to 21.30hr. The floodlighting is switched off at 23.00hr."});
            mainText.insert({name: "Kitzbuel", pid: 147, text: "Toning up your body can bring your mind back in full swing. There are a wide range of popular devices for cardio training and weight reducing areas with special offers like back gymnastics, aerobics or power plate. They also offer advice on issues such as nutrition, vital system, fit-over-50 and anti-aging treatment. They will gladly advise you on the spot.", plen: "359", markedText: "Toning up your body can bring your mind back in full swing. There are a wide range of popular devices for cardio training and weight reducing areas with special offers like back gymnastics, aerobics or power plate. They also offer advice on issues such as nutrition, vital system, fit-over-50 and anti-aging treatment. They will gladly advise you on the spot."});
            mainText.insert({name: "Kitzbuel", pid: 148, text: "Treat yourself to sometime in the pool with the wellness and health centre in the heart of Kitzbuehel! In any weather, in any season. Exercise like a fish in water in the Aquarena swimming complex. Relax and unwind in the sauna and be pampered from head to toe in the Aquarena spa.", plen: "281", markedText: "Treat yourself to sometime in the pool with the wellness and health centre in the heart of Kitzbuehel! In any weather, in any season. Exercise like a fish in water in the Aquarena swimming complex. Relax and unwind in the sauna and be pampered from head to toe in the Aquarena spa."});
            mainText.insert({name: "Kitzbuel", pid: 149, text: "Unique! The Heilmoorkur: Treatment services with the herb peat from the Kitzbuehel Lutzenberg bog. Enjoy the physio-thermal fit and health cabins (which is included in the ticket price)! An infrared sauna is located in the area of sports pool and two more can be found in the sauna area.", plen: "287", markedText: "Unique! The Heilmoorkur: Treatment services with the herb peat from the Kitzbuehel Lutzenberg bog. Enjoy the physio-thermal fit and health cabins (which is included in the ticket price)! An infrared sauna is located in the area of sports pool and two more can be found in the sauna area."});
            mainText.insert({name: "Kitzbuel", pid: 150, text: "Forget the hustles and bustles of everyday life! Treat yourself to some relaxation and pampering at the swimming, spa and health centre in the heart of Kitzbuehel. The unrivalled oasis of well-being in every season. Endless fun at the Aquarena swimming complex.", plen: "261", markedText: "Forget the hustles and bustles of everyday life! Treat yourself to some relaxation and pampering at the swimming, spa and health centre in the heart of Kitzbuehel. The unrivalled oasis of well-being in every season. Endless fun at the Aquarena swimming complex."});
            mainText.insert({name: "Kitzbuel", pid: 152, text: "- swimming area with waterfall,", plen: "31", markedText: "- swimming area with waterfall,"});
            mainText.insert({name: "Kitzbuel", pid: 153, text: "- winter/summer adventure slide,", plen: "32", markedText: "- winter/summer adventure slide,"});
            mainText.insert({name: "Kitzbuel", pid: 154, text: "- 25m sports pool,", plen: "18", markedText: "- 25m sports pool,"});
            mainText.insert({name: "Kitzbuel", pid: 155, text: "- childrens play area,", plen: "22", markedText: "- childrens play area,"});
            mainText.insert({name: "Kitzbuel", pid: 156, text: "- sauna area with heated recliners,", plen: "35", markedText: "- sauna area with heated recliners,"});
            mainText.insert({name: "Kitzbuel", pid: 157, text: "- Turkish hamam steam bath,", plen: "27", markedText: "- Turkish hamam steam bath,"});
            mainText.insert({name: "Kitzbuel", pid: 158, text: "- sports and healing massage,", plen: "29", markedText: "- sports and healing massage,"});
            mainText.insert({name: "Kitzbuel", pid: 159, text: "- playroom,", plen: "11", markedText: "- playroom,"});
            mainText.insert({name: "Kitzbuel", pid: 160, text: "- restaurant 'Oase' with bar - access to restaurant is also possible without entering Aquarena.", plen: "95", markedText: "- restaurant 'Oase' with bar - access to restaurant is also possible without entering Aquarena."});
            mainText.insert({name: "Kitzbuel", pid: 164, text: "Aquafitness: every Tuesday 06.30 p.m. Luxuriate in the Physiotherm health and fitness cabins (included in the entrance fee)! There is an infrared cabin in the sports pool area, and two more in the sauna area.", plen: "208", markedText: "Aquafitness: every Tuesday 06.30 p.m. Luxuriate in the Physiotherm health and fitness cabins (included in the entrance fee)! There is an infrared cabin in the sports pool area, and two more in the sauna area."});
            mainText.insert({name: "Kitzbuel", pid: 166, text: "Prices per day:", plen: "15", markedText: "Prices per day:"});
            mainText.insert({name: "Kitzbuel", pid: 167, text: "adults EUR 15,00, with the guestcard 'Red Card' EUR 14,20 ", plen: "58", markedText: "adults EUR 15,00, with the guestcard 'Red Card' EUR 14,20 "});
            mainText.insert({name: "Kitzbuel", pid: 168, text: "youths EUR 11,80, with the guestcard 'Red Card' EUR 11,20 ", plen: "58", markedText: "youths EUR 11,80, with the guestcard 'Red Card' EUR 11,20 "});
            mainText.insert({name: "Kitzbuel", pid: 169, text: "children EUR 7,50, with the guestcard 'Red Card' EUR 7,00 ", plen: "58", markedText: "children EUR 7,50, with the guestcard 'Red Card' EUR 7,00 "});
            mainText.insert({name: "Kitzbuel", pid: 171, text: "Kiddie's special' children with min. 1 adult EUR 5,00 ", plen: "54", markedText: "Kiddie's special' children with min. 1 adult EUR 5,00 "});
            mainText.insert({name: "Kitzbuel", pid: 173, text: "evening ticket from 06.00 p.m. EUR 8,30 ", plen: "40", markedText: "evening ticket from 06.00 p.m. EUR 8,30 "});
            mainText.insert({name: "Kitzbuel", pid: 174, text: "group ticket (from 10 persons - 1 for free) EUR 13,50 ", plen: "54", markedText: "group ticket (from 10 persons - 1 for free) EUR 13,50 "});
            mainText.insert({name: "Kitzbuel", pid: 175, text: "ticket for 2 hours EUR 10,80 ", plen: "29", markedText: "ticket for 2 hours EUR 10,80 "});
            mainText.insert({name: "Kitzbuel", pid: 177, text: "Seasonpass: ", plen: "12", markedText: "Seasonpass: "});
            mainText.insert({name: "Kitzbuel", pid: 178, text: "adults EUR 178,00 ", plen: "18", markedText: "adults EUR 178,00 "});
            mainText.insert({name: "Kitzbuel", pid: 179, text: "youths EUR 143,00 ", plen: "18", markedText: "youths EUR 143,00 "});
            mainText.insert({name: "Kitzbuel", pid: 180, text: "children EUR 90,00 ", plen: "19", markedText: "children EUR 90,00 "});
            mainText.insert({name: "Kitzbuel", pid: 182, text: "Reduction: 5% with the guestcard „Red Card“ of Kitzbühel Tourismus ", plen: "67", markedText: "Reduction: 5% with the guestcard „Red Card“ of Kitzbühel Tourismus "});
            mainText.insert({name: "Kitzbuel", pid: 185, text: "There is a renewed interest in the traditional winter sport of ice skating. Now it doesn’t depend on the weather anymore as it has moved indoors. A lot more fun for all the family, with good music, you can swing across well looked after ice to your own tempo. The new Ice Rink in Kitzbuehel has an area of 1,800 square metres of ice designed to please the present and future stars of the ice. If you prefer the outdoor rink, there is also a 600 square metre rink on offer. It is possible to arrange a trip for the whole family or for schools as an alternative sport activity. We cater for special ice parties such as Carnival or children’s birthdays. Skates are available to rent in house.", plen: "689", markedText: "There is a renewed interest in the traditional winter sport of ice skating. Now it doesn’t depend on the weather anymore as it has moved indoors. A lot more fun for all the family, with good music, you can swing across well looked after ice to your own tempo. The new Ice Rink in Kitzbuehel has an area of 1,800 square metres of ice designed to please the present and future stars of the ice. If you prefer the outdoor rink, there is also a 600 square metre rink on offer. It is possible to arrange a trip for the whole family or for schools as an alternative sport activity. We cater for special ice parties such as Carnival or children’s birthdays. Skates are available to rent in house."});
            mainText.insert({name: "Kitzbuel", pid: 186, text: "Entry prices: ", plen: "14", markedText: "Entry prices: "});
            mainText.insert({name: "Kitzbuel", pid: 187, text: "adults EUR 6", plen: "12", markedText: "adults EUR 6"});
            mainText.insert({name: "Kitzbuel", pid: 188, text: "youths EUR 4", plen: "12", markedText: "youths EUR 4"});
            mainText.insert({name: "Kitzbuel", pid: 189, text: "children EUR 3", plen: "14", markedText: "children EUR 3"});
            mainText.insert({name: "Kitzbuel", pid: 190, text: "Skate hire per person EUR 3", plen: "27", markedText: "Skate hire per person EUR 3"});
        }*/
        console.log("reset done");
    }
});

Template.dbdata.helpers({
    'showMainText': function () {
        //console.log('mainText.find.count: ', mainText.find().count());
        var main = mainText.find({}, {sort: {experimentType: 1, groupId: 1, pid: 1}}).fetch();
        if (main)
            return main;
        else
            return null;
    },
    'showUHexperiments': function () {
        //console.log('mainText.find.count: ', mainText.find().count());
        var main = UHexperiments.find({}, {sort: {experimentType: 1, groupId: 1}}).fetch();
        if (main)
            return main;
        else
            return null;
    },
    'showTestText': function () {
        //console.log('mainText.find.count: ', mainText.find().count());
        /*var main = testText.find({}, {sort: {experimentType: 1, groupId: 1, pid: 1}}).fetch();
        if (main)
            return main;
        else
            return null;*/
    },
    'showBigLog': function () {
        //console.log('mainText.find.count: ', mainText.find().count());
        var main = bigLog.find({}, {sort: {goupId: 1, currDateStr: 1, currMsec: 1}}).fetch();
        if (main)
            return main;
        else
            return null;
    }
});

Template.itemText.helpers({
    'color': function() {
        return Session.get('markColor');
    },
    'showText': function() {
        console.log('--------------showText:');
        //var pids = mainText.find({name: 'Kitcbuel'}, {sort: {pid: 1}}).fetch();

        /*for (var i = 0; i < pids.length; i++) {
            var marks = marked.find({pId: pids[i].pid}, {sort: {endPos: -1}}).fetch();
            var markedText = pids[i].text;
            for (var j = 0; j < marks.length; j++) {
                markedText = [markedText.slice(0, parseInt(marks[j].endPos)), "</mark>", markedText.slice(parseInt(marks[j].endPos))].join('');
                markedText = [markedText.slice(0, parseInt(marks[j].startPos)), "<mark>", markedText.slice(parseInt(marks[j].startPos))].join('');
            }
            console.log(markedText);
            mainText.update(pids[i]._id, {$set: {markedText: markedText}});
        }*/
        console.log('mainText.count: ', mainText.find().count(), 'mainText.find.count:', mainText.find().count());
        var main = mainText.find({}, {sort: {pid: 1}}).fetch();
        if (main)
            return main;
        else
            return null;
    },
    'resortName': function() {
        var exp = UHexperiments.findOne();
        if (exp)
            return exp.resort;
        else
            return false;
    }
});

function aggregateMarks() {
    var marks = marked.find().fetch();
    if (marks.length > 0) {
        aggs = [marks[0]];
        aggs[0].num = 1;
        for (var i = 1; i < marks.length; i++) {
            var newAggs = aggs.slice();
            var insertFlg = true;
            for (var j = 0; j < aggs.length; j++) {
                if (marks[i].pid == aggs[j].pid) {
                    if (marks[i].startPos == aggs[j].startPos && marks[i].endPos == aggs[j].endPos) {
                        newAggs.num += 1;
                        insertFlg = false;
                    }
                    else if (parseInt(marks[i].endPos, 10) > parseInt(aggs[j].startPos, 10) && parseInt(aggs[j].endPos, 10) > parseInt(marks[i].startPos, 10)) {
                        var mins = [parseInt(marks[i].endPos, 10), parseInt(aggs[j].startPos, 10), parseInt(marks[i].startPos, 10), parseInt(aggs[j].endPos, 10)];
                        mins.sort();
                        newAggs.push({pid: aggs[j].pid, startPos: mins[0], endPos: mins[1], num: 1});
                        newAggs.push({pid: aggs[j].pid, startPos: mins[1], endPos: mins[2], num: 1});
                        newAggs.push({pid: aggs[j].pid, startPos: mins[2], endPos: mins[3], num: 1});
                        insertFlg = false;
                    }
                }
            }
            if (insertFlg) {
                newAggs.push({pid: marks[i].pid, startPos: marks[i].startPos, endPos: marks[i].endPos, num: 1});
            }
            aggs = newAggs.slice();
        }
    }
};

function sortNumber(a,b) {
    return a - b;
}

function countMarks() {
    var markedP = [];
    var posArr = {};
    var posDict = {};
    var marks = marked.find().fetch();
    for (var j = 0; j < marks.length; j++) {
        if (!(marks[j].pId in posArr)) {
            console.log('Create new paragraph entrance');
            markedP.push(parseInt(marks[j].pId, 10));
            posArr[marks[j].pId] = [];
            posDict[marks[j].pId] = {};
        }

        var startPos = parseInt(marks[j].startPos, 10);
        var endPos = parseInt(marks[j].endPos, 10);
        if (!(startPos in posArr[marks[j].pId])) {
            posArr[marks[j].pId].push(startPos);
            posDict[marks[j].pId][startPos] = 1;
        }
        else {
            posDict[marks[j].pId][startPos] = posDict[marks[j].pId][startPos] + 1;
        }

        if (!(endPos in posArr[marks[j].pId])) {
            posArr[marks[j].pId].push(endPos);
            posDict[marks[j].pId][endPos] = -1;
        }
        else {
            posDict[marks[j].pId][endPos] = posDict[marks[j].pId][endPos] - 1;
        }
    }

    markedP.sort(sortNumber);
    var displayArr = [];
    for (var j = 0; j < markedP.length; j++) {
        posArr[markedP[j]].sort(sortNumber);
        var pid = mainText.find({pid: markedP[j]}).fetch();
        var i = 0;
        var weight = 0;
        while (i < posArr[markedP[j]].length - 1) {
            weight = weight + posDict[markedP[j]][posArr[markedP[j]][i]];
            if (weight == 0) {
                i++;
            }
            else {
                var k = i + 1;
                while (posDict[markedP[j]][posArr[markedP[j]][k]] == 0) {
                    k++;
                }
                displayArr.push({text: pid[0].text.slice(posArr[markedP[j]][i], posArr[markedP[j]][k]), refCount: weight});
                i = k;
            }
        }
    }
    return displayArr;
};

Template.BTaskUI.events({
    "submit form#budgetForm": function (event) {
        event.preventDefault();
        Meteor.call('goToBudgetExitSurvey');
        Router.go('thankyou');
        /*Meteor.call('updateBudget', $(event.target).serializeArray(), function(err, res){
            if (!err) {
                Router.go('thankyou');
            }
        });*/
    }
});

Template.BTaskUI.helpers({
    'showMarks': function() {
        console.log("here");
        //aggregateMarks();
    },
    'pMarks': function() {
        var displayArr = countMarks(); //[{refCount: 10, text: 'asdf'}, {refCount: 11, text: 'asdddff'}];
        return displayArr;
        /*return _.map(this.Address, function(value, key) {
            return {
                key: key,
                value: value
            };
        });*/
    }
});

/*Session.setDefault('page', 'home');

Template.UI.helpers({
  isPage: function(page){
    return Session.equals('page', page)
  }
})

Template.UI.events({
  'click .clickChangesPage': function(event, template){
    Session.set('page', event.currentTarget.getAttribute('data-page'))
  }
})

Template.hello.events({
    'click button'(event, instance) {
      // Go no next page
      //Router.go('/product');
  },
});

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },
});
*/