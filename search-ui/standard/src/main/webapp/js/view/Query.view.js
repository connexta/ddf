/*global define*/

define(function (require) {
    "use strict";
    var $ = require('jquery'),
        Backbone = require('backbone'),
        Marionette = require('marionette'),
        _ = require('underscore'),
        ich = require('icanhaz'),
        ddf = require('ddf'),
        properties = require('properties'),
        MetaCard = require('js/model/Metacard'),
        Progress = require('js/view/Progress.view'),
        Spinner = require('spin'),
        spinnerConfig = require('spinnerConfig'),
        Query = {};

    ich.addTemplate('searchFormTemplate', require('text!templates/searchForm.handlebars'));
    require('datepickerOverride');
    require('datepickerAddon');
    require('modelbinder');
    require('multiselect');
    require('multiselectfilter');


    Query.Model = Backbone.Model.extend({
        //in the search we are checking for whether or not the model
        //only contains 4 items to know if we can search or not
        //as soon as the model contains more than 4 items, we assume
        //that we have enough values to search
        defaults: {
            offsetTimeUnits: "hours",
            radiusUnits: "meters",
            radius: 0,
            radiusValue: 0
        },
        initialize: function () {
            this.on('change', this.log);
            this.on('change:north change:south change:east change:west',this.setBBox);
            _.bindAll(this,'swapDatesIfNeeded');
        },
        log: function () {
            if (typeof console !== 'undefined') {
                console.log(this.toJSON());
            }
        },

        setDefaults : function() {
            var model = this;
            _.each(_.keys(model.defaults), function(key) {
                model.set(key, model.defaults[key]);
            });
        },

        setBBox : function() {
            var north = this.get('north'),
                south = this.get('south'),
                west = this.get('west'),
                east = this.get('east');
            if(north && south && east && west){
                this.set('bbox', [west,south,east,north].join(','));
            }

        },

        swapDatesIfNeeded : function() {
            var model = this;
            if(model.get('dtstart') && model.get('dtend')){
                var start = new Date(model.get('dtstart'));
                var end = new Date(model.get('dtend'));
                if(start > end){
                    this.set({
                        dtstart : end.toISOString(),
                        dtend : start.toISOString()
                    });
                }
            }
        }
    });

    Query.QueryView = Marionette.ItemView.extend({
        template: 'searchFormTemplate',
        className : 'slide-animate',

        events: {
            'click .searchButton': 'search',
            'click .resetButton': 'reset',
            'click .time': 'clearTime',
            'click .location': 'clearLocation',
            'click .type': 'clearType',
            'click .federation': 'clearFederation',
            'click button[name=pointRadiusButton]' : 'drawCircle',
            'click button[name=bboxButton]' : 'drawExtent',
            'click button[name=noFederationButton]' : 'noFederationEvent',
            'click button[name=selectedFederationButton]': 'selectedFederationEvent',
            'click button[name=enterpriseFederationButton]': 'enterpriseFederationEvent',
            'keypress input[name=q]': 'filterOnEnter',
            'change #radiusUnits': 'onRadiusUnitsChanged',
            'change #offsetTimeUnits': 'onTimeUnitsChanged'
        },

        initialize: function (options) {
            _.bindAll(this);
            this.model = new Query.Model();
            this.modelBinder = new Backbone.ModelBinder();
            this.sources = options.sources;
        },

        noFederationEvent : function(){
            this.model.set('src','local');
            this.updateScrollbar();
        },

        enterpriseFederationEvent : function(){
            this.model.unset('src');
            this.updateScrollbar();
        },

        selectedFederationEvent : function(){
            this.model.unset('src');
            this.updateScrollbar();
        },

        clearTime: function () {
            this.model.set({
                dtstart: undefined,
                dtend: undefined,
                dtoffset: undefined,
                offsetTime: undefined
            }, {unset: true});
            this.resetDateTimePicker('#absoluteStartTime');
            this.resetDateTimePicker('#absoluteEndTime');
            this.updateScrollbar();
        },

        clearLocation: function () {
            this.model.set({
                north: undefined,
                east: undefined,
                west: undefined,
                south: undefined,
                lat: undefined,
                lon: undefined,
                radius: undefined,
                bbox: undefined
            }, {unset: true});
            ddf.app.controllers.drawCircleController.stop();
            ddf.app.controllers.drawExentController.stop();
            this.updateScrollbar();
        },

        clearType: function () {
            this.model.set({
                type: undefined
            }, {unset: true});
            this.updateScrollbar();
        },

        updateScrollbar: function () {
            this.trigger('content-update');
        },

        serializeData: function () {
            var allTypes = _.chain(this.sources.map(function (source) {
                return source.get('contentTypes');
            })).flatten().unique().value();
            var allSources = this.sources.toJSON();
            return _.extend(this.model.toJSON(), {types: allTypes, sources: allSources});
        },

        onRender: function () {
            var view = this;

            var radiusConverter = function (direction, value) {
                    var unitVal = view.model.get("radiusUnits");
                    if (direction === 'ModelToView') {
                        //radius value is bound to radius since radiusValue is converted, so we just need to set
                        //the value so that it shows up in the view
                        view.model.set("radiusValue", view.getDistanceFromMeters(parseInt(value, 10), unitVal));
                        return view.getDistanceFromMeters(parseInt(value, 10), unitVal);
                    } else {
                        return view.getDistanceInMeters(parseInt(value, 10), unitVal);
                    }
                },
                offsetConverter = function (direction, value) {
                    if (direction !== 'ModelToView') {
                        //all we really need to do is just calculate the dtoffset on the model based on these two values
                        view.model.set("dtoffset", view.getTimeInMillis(view.$("input[name=offsetTime]").val(), view.$("select[name=offsetTimeUnits]").val()));
                    }
                    return value;
                },
                federationConverter = function(direction,value){
                    // If there are multiple federated sources, the model wants 
                    // a comma separated string for the list of federated sources.  
                    // If there is only one federated source, the model wants
                    // just the souce name (no comma).  The join will only return 
                    // a comma separated string if there are multiple federated
                    // source.  If there is only one federated source, the join
                    // will only return the federated source (without a comma).
                    if(value && direction === "ViewToModel"){
                        return value.join(',');
                    } else if (value && direction === "ModelToView") {
                        // The view wants an array.  We need to convert
                        // the string of federated sources from the model
                        // to an array.
                        return value.split(',');
                    }
                };

            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'name');
            bindings.radius.selector = '[name=radiusValue]';
            bindings.radius.converter = radiusConverter;
            bindings.offsetTime.converter = offsetConverter;
            bindings.offsetTimeUnits.converter = offsetConverter;
            bindings.src = {};
            bindings.src.selector = '#federationSources';
            bindings.src.converter =  federationConverter;


            this.modelBinder.bind(this.model, this.$el, bindings);

            this.listenTo(this.model, 'change:bbox change:radius', this.updateShouldFlyToExtent);

            this.initDateTimePicker('#absoluteStartTime');
            this.initDateTimePicker('#absoluteEndTime');
            
            this.delegateEvents();

            var multiselectTypesOptions = {
                minWidth: 350,
                height: 185,
                classes: 'multiselect',
                noneSelectedText: 'Select types',
                checkAllText: 'Select all',
                uncheckAllText: 'Deselect all',
                selectedText: function(numChecked, numTotal){
                    return numChecked + ' of ' + numTotal + ' selected';
                }
            },
            multiselectSourcesOptions = {
                minWidth: 350,
                height: 185,
                classes: 'multiselect',
                noneSelectedText: 'Select sources',
                checkAllText: 'Select all',
                uncheckAllText: 'Deselect all',
                selectedText: function(numChecked, numTotal){
                    return numChecked + ' of ' + numTotal + ' selected';
                }
           },
            singleselectOptions = {
                header: false,
                minWidth: 110,
                height: 185,
                classes: 'add-on multiselect',
                multiple: false,
                selectedText: function(numChecked, numTotal, checkedItems){
                    if(checkedItems && checkedItems.length > 0) {
                        return checkedItems.pop().value;
                    }
                    return '';
                }
            };

            this.$('#typeList').multiselect(multiselectTypesOptions).multiselectfilter();

            this.$('#federationSources').multiselect(multiselectSourcesOptions).multiselectfilter();

            this.$('#radiusUnits').multiselect(singleselectOptions);

            this.$('#offsetTimeUnits').multiselect(singleselectOptions);
        },

        beforeShowDatePicker: function(picker){
            picker.style.zIndex = 200;
        },

        drawCircle: function(){
            ddf.app.controllers.drawCircleController.draw(this.model);
        },

        drawExtent : function(){
            ddf.app.controllers.drawExentController.draw(this.model);
        },

        onClose: function () {
            this.modelBinder.unbind();
        },

        filterOnEnter: function (e) {
            var view = this;
            if (e.keyCode === 13) {
                // defer it to make sure the event to set the query parameter is run
                _.defer(function () {
                    view.search();
                });
            }

        },

        updateShouldFlyToExtent: function () {
            this.shouldFlyToExtent = this.model.get("bbox") || this.model.get("radius") ? true : false;
        },

        search: function () {

            //check that we can even perform a search
            //the model has 4 default attributes, so if we only have 4
            //then we have no search criteria
            //if we have 5 and one of them is the 'src' attribute, then we
            //still have no search criteria
            var modelSize = _.size(this.model.attributes);
            if (modelSize === 4 || (modelSize === 5 && this.model.get('src'))) {
                return;
            }

            var progress = new Progress.ProgressModel();

            var progressFunction = function(val, resp) {
                                        progress.increment.call(progress, {value: val, response: resp});
                                    };

            //get results
            var queryParams, view = this, result, options;
            queryParams = this.model.toJSON();
            
            options = {
                'queryParams': queryParams
            };

            result = new MetaCard.SearchResult(options);

            if (properties.sync) {
                result.useAjaxSync = true;
                result.url = result.syncUrl;
            }

            this.trigger('search', result, this.model, this.sources.length, progress);

            var spinner = new Spinner(spinnerConfig).spin(this.el);
            // disable the whole form
            this.$('button').addClass('disabled');
            this.$('input').prop('disabled',true);
            ddf.app.controllers.drawCircleController.stopDrawing();
            ddf.app.controllers.drawExentController.stopDrawing();

            result.fetch({
                progress: progressFunction,
                data: result.getQueryParams(),
                dataType: "json",
                timeout: 300000,
                error : function(){
                    spinner.stop();
                    if (typeof console !== 'undefined') {
                        console.error(arguments);
                    }
                }
            }).complete(function () {
                    spinner.stop();

                    //re-enable the whole form
                    view.$('button').removeClass('disabled');
                    view.$('input').prop('disabled',false);
                    view.trigger('searchComplete', result, view.shouldFlyToExtent);
                });


        },

        reset: function () {
            $('button[name=noTemporalButton]').click();
            $('button[name=noLocationButton]').click();
            $('button[name=noTypeButton]').click();
            $('button[name=enterpriseFederationButton]').click();
            $('#progressbar').hide();
            this.model.clear();
            this.model.setDefaults();
            this.trigger('clear');
            $('input[name=q]').focus();
            this.shouldFlyToExtent = false;
            ddf.app.controllers.geoController.billboardCollection.removeAll();
        },

        onRadiusUnitsChanged: function () {
            this.$('input[name=radiusValue]').val(
                this.getDistanceFromMeters(this.model.get('radius'), this.$('#radiusUnits').val()));
        },

        onTimeUnitsChanged : function(){
            var timeInMillis = this.getTimeInMillis(this.model.get('dtoffset'), this.$('#offsetTimeUnits').val());
            // silently set it so as not to trigger a modelbinder update
            this.model.set('dtoffset', timeInMillis, {silent:true});
        },

        getDistanceInMeters: function (distance, units) {
            distance = distance || 0;

            switch (units) {
                case "meters":
                    return distance;
                case "kilometers":
                    return distance * 1000;
                case "feet":
                    return Math.ceil(distance * 0.3048);
                case "yards":
                    return Math.ceil(distance * 0.9144);
                case "miles":
                    return Math.ceil(distance * 1609.34);
                default:
                    return distance;
            }
        },
        getDistanceFromMeters: function (distance, units) {
            distance = distance || 0;

            switch (units) {
                case "meters":
                    return distance;
                case "kilometers":
                    return distance / 1000;
                case "feet":
                    return Math.ceil(distance / 0.3048);
                case "yards":
                    return Math.ceil(distance / 0.9144);
                case "miles":
                    return Math.ceil(distance / 1609.34);
                default:
                    return distance;
            }
        },

        getTimeInMillis: function (val, units) {
            switch (units) {
                case "seconds":
                    return val * 1000;
                case "minutes":
                    return this.getTimeInMillis(val, 'seconds') * 60;
                case "hours":
                    return this.getTimeInMillis(val, 'minutes') * 60;
                case "days":
                    return this.getTimeInMillis(val, 'hours') * 24;
                case "weeks":
                    return this.getTimeInMillis(val, 'days') * 7;
                case "months":
                    return this.getTimeInMillis(val, 'weeks') * 4;
                case "years" :
                    return this.getTimeInMillis(val, 'days') * 365;
                default:
                    return val;
            }
        },
        
        resetDateTimePicker: function(selector) {
            this.$(selector).datetimepicker('destroy');
            this.initDateTimePicker(selector);

        },
        
        initDateTimePicker: function (selector) {
            this.$(selector).datetimepicker({
                dateFormat: $.datepicker.ATOM,
                timeFormat: "HH:mm:ss.lz",
                separator: "T",
                timezoneIso8601: true,
                useLocalTimezone: true,
                showHour: true,
                showMinute: true,
                showSecond: false,
                showMillisec: false,
                showTimezone: false,
                minDate: new Date(100, 0, 2),
                maxDate: new Date(9999, 11, 30),
                onClose: this.model.swapDatesIfNeeded,
                beforeShow: this.beforeShowDatePicker
        });
      }

    });

    return Query;

});


