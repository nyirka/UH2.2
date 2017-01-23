Router.configure({
    layoutTemplate: 'layout',
    //waitOn: function() { return Meteor.subscribe('posts'); }
});

Router.route('description', {name: 'description'});
Router.route('quiz', {name: 'quiz'});
Router.route('itemUI', {name: 'itemUI'});
//Router.route('BTaskUI', {name: 'BTaskUI'});
//Router.route('thankyou', {name: 'thankyou'});

Router.route('main', {
    path: '/',
    template: 'start'
});

Router.route('/thankyou', function() {
    console.log('-------------render thankyou');
    this.render('thankyou');
});

Router.route('failed', {name: 'failed'});
Router.route('dbdata', {name: 'dbdata'});