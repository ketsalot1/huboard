import CssView from 'app/views/css';
import Board from 'app/models/board';
import Ember from 'ember';
import CreateIssue from 'app/models/forms/create-issue';
import Issue from 'app/models/issue';

var IndexRoute = Ember.Route.extend({
  qps: Ember.inject.service("query-params"),

  model: function(){
    var repo = this.modelFor("application");
    var linked_boards = repo.fetchLinkedBoards();
    return repo.fetchBoard(linked_boards);
  },
  afterModel: function (model){
    if(App.get("isLoaded")) {
      return;
    }
    return model.linkedBoardsPreload.done(function(linkedBoardsPromise){
      App.set("isLoaded", true); 
      var socket = this.get("socket");
      return linkedBoardsPromise.then(function(boards){
        boards.forEach(function(b) {
          if(b.failure) {return;}
          var issues = Ember.A();
          b.issues.forEach(function(i){
            issues.pushObject(Issue.create(i));
          });
          var board = Board.create(_.extend(b, {issues: issues}));
          model.linkedRepos.pushObject(board);
          socket.subscribeTo(b.full_name);
        });
        var cssView = CssView.create({
          content: model
        });
        cssView.appendTo("head");
        return boards;
      });
    }.bind(this));
  },
  renderTemplate: function() {

    this._super.apply(this, arguments);
    this.render('assignee', {into: 'index', outlet: 'sidebarTop'});
    this.render('filters', {into: 'index', outlet: 'sidebarMiddle'});
  },
  setupController: function(controller, model){
   this._super(controller, model);
   this.get("qps").applyFilterBuffer();
   this.get("qps").applySearchBuffer();
  },

  actions : {
    createNewIssue: function(issue){
      var issues = this.modelFor("index").get("issues");
      issues.pushObject(issue);
    },
    createFullscreenIssue : function (model, order) {
      this.controllerFor("issue.create").set("model", model || CreateIssue.createNew());
      this.controllerFor("issue.create").set("order", order || {});
      this.send("openModal","issue.create");
    },
    archive: function (issue) {
      issue.archive();
    },
    openIssueFullscreen: function(model){
      this.transitionTo("index.issue", model);
    },
  }
});

export default IndexRoute;
