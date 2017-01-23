Meteor.publish('getMainText', function(groupId) {
    console.log('----------------------------------publish mainText:');
    if (groupId != null) {
        if (typeof(groupId) === "boolean" && groupId == true) {
            console.log('Admin publications:');
            return mainText.find({groupId: {$ne : ""}});
        }
        else {
            console.log(groupId);
            var exp = UHexperiments.findOne({groupId: groupId});
            console.log(exp);
            if (exp.experimentType == "1") {
                console.log("experimentType = 1");
                console.log(mainText.find({groupId: "", experimentType: "1"}).count());
                return mainText.find({groupId: "", experimentType: "1", name: exp.resort});
            }
            else if (exp.experimentType == "3B") {
                console.log("experimentType = 3B");
                console.log(mainText.find({groupId: exp.goAfter}).count());
                return mainText.find({groupId: exp.goAfter});
            }
            else {
                console.log("experimentType <> 1 and 3B");
                console.log(mainText.find({groupId: groupId}).count());
                return mainText.find({groupId: groupId});
                //groupId: "LG6TNJP6q5sdoNYhe"
            }
        }
    }
    else console.log('groupId is null');
});

Meteor.publish('getMarked', function(groupId) {
    console.log('----------------------------------publish marked');
    if (groupId != null) {
        if (typeof(groupId) === "boolean" && groupId == true) {
            console.log('Admin publications:');
            return marked.find();
        }
        else {
            var exp = UHexperiments.findOne({groupId: groupId});
            console.log(exp);
            if (exp.experimentType == "3B") {
                console.log("experimentType = 3B");
                console.log(marked.find({groupId: exp.goAfter}).count());
                return marked.find({groupId: exp.goAfter});
            }
            else {
                console.log(marked.find({groupId: groupId}).count());
                return marked.find({groupId: groupId});
            }
        }
    }
    else console.log('groupId is null');
});

Meteor.publish('getUHexperiments', function(groupId) {
    if (typeof(groupId) === "boolean" && groupId == true) {
        console.log('Admin publications:');
        return UHexperiments.find();
    }
    else
        return UHexperiments.find({groupId: groupId});
});

Meteor.publish('getTestText', function(groupId) {
    console.log('----------------------------------publish testText');
    if (groupId != null) {
        if (typeof(groupId) === "boolean" && groupId == true) {
            console.log('Admin publications:');
            return testText.find();
        }
        else {
            var exp = UHexperiments.findOne({groupId: groupId});
            console.log(exp);
            return testText.find({groupId: groupId});
        }
    }
    else console.log('groupId is null');
});

Meteor.publish('getTestMarked', function(groupId) {
    console.log('----------------------------------publish testMarked');
    if (groupId != null) {
        if (typeof(groupId) === "boolean" && groupId == true) {
            console.log('Admin publications:');
            return testMarked.find();
        }
        else {
            var exp = UHexperiments.findOne({groupId: groupId});
            console.log(exp);
            return testMarked.find({groupId: groupId});
        }
    }
    else console.log('groupId is null');
});

Meteor.publish('bigLog', function(groupId) {
    console.log('----------------------------------publish bigLog');
    if (typeof(groupId) === "boolean" && groupId == true)
        return bigLog.find();
});