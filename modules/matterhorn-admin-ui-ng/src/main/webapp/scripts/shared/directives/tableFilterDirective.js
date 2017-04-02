angular.module('adminNg.directives')
.directive('adminNgTableFilter', ['Storage', 'FilterProfiles', 'Language', 'underscore', function (Storage, FilterProfiles, Language, _) {
    return {
        templateUrl: 'shared/partials/tableFilters.html',
        replace: true,
        scope: {
            filters:   '=',
            namespace: '='
        },
        link: function (scope) {
            scope.formatDateRange = Language.formatDateRange;
            scope.filterMap = {};

            scope.getOptionLabel = function (filter) {
                var optionLabel;

                angular.forEach(filter.options, function (id, label) {
                    if (id === filter.value) {
                        optionLabel = label;
                    }
                });

                return optionLabel;
            };

            scope.initializeMap = function() {
                 for (var key in scope.filters.filters) {
                     scope.filters.map[key] = {
                         options: {},
                         type: scope.filters.filters[key].type,
                         label: scope.filters.filters[key].label
                     };
                     var options = scope.filters.filters[key].options;
                     angular.forEach(options, function(option) {
                          scope.filters.map[key].options[option.value] = option.label;
                     });
                 }
            }

            scope.restoreFilters = function () {
                angular.forEach(scope.filters.filters, function (filter, name) {
                    filter.value = Storage.get('filter', scope.namespace)[name];

                    if (scope.filters.map[name]) {
                        scope.filters.map[name].value = filter.value;
                    }
                });
                scope.textFilter = Storage.get('filter', scope.namespace).textFilter;
            };

            scope.filters.$promise.then(function () {
                scope.filters.map = scope.filterMap;
                scope.restoreFilters();

                if (Object.keys(scope.filters.map).length === 0) {
                    scope.initializeMap();
                }
            });

            scope.removeFilters = function () {
                angular.forEach(scope.filters.map, function (filter) {
                    delete filter.value;
                });

                scope.selectedFilter = null;
                scope.showFilterSelector = false;
                Storage.remove('filter');
            };

            scope.removeFilter = function (name, filter) {
                delete filter.value;
                Storage.remove('filter', scope.namespace, name);
            };

            scope.selectFilterTextValue = _.debounce(function (filterName, filterValue) {
                scope.showFilterSelector = false;
                scope.selectedFilter = null;
                Storage.put('filter', scope.namespace, filterName, filterValue);
            }, 250);

            scope.selectFilterSelectValue = function (filterName, filter)  {
                scope.showFilterSelector = false;
                scope.selectedFilter = null;
                Storage.put('filter', scope.namespace, filterName, filter.value);
                scope.filters.map[filterName].value = filter.value;
            };

            scope.toggleFilterSettings = function () {
                scope.mode = scope.mode ? 0:1;
            };

            scope.selectFilterPeriodValue = function (filterName, filter) {
                // Merge from-to values of period filter)
                if (!filter.period.to || !filter.period.from) {
                    return;
                }
                if (filter.period.to && filter.period.from) {
                    filter.value = new Date(filter.period.from).toISOString() + '/' + new Date(filter.period.to).toISOString();
                }

                if (filter.value) {
                    scope.showFilterSelector = false;
                    scope.selectedFilter = null;
                    Storage.put('filter', scope.namespace, filterName, filter.value);
                    if (!scope.filters.map[filterName]) {
                      scope.filters.map[filterName] = {};
                    }
                    scope.filters.map[filterName].value = filter.value;
                }
            };

            // Restore filter profiles
            scope.profiles = FilterProfiles.get(scope.namespace);

            scope.validateProfileName = function () {
                var profileNames = FilterProfiles.get(scope.namespace).map(function (profile) {
                    return profile.name;
                });
                scope.profileForm.name.$setValidity('uniqueness',
                        profileNames.indexOf(scope.profile.name) <= -1);
            };

            scope.saveProfile = function () {
                if (angular.isDefined(scope.currentlyEditing)) {
                    scope.profiles[scope.currentlyEditing] = scope.profile;
                } else {
                    scope.profile.filter = angular.copy(Storage.get('filter', scope.namespace));
                    scope.activeProfile = scope.profiles.push(scope.profile) - 1;
                }

                FilterProfiles.set(scope.namespace, scope.profiles);
                scope.profile = {};
                scope.mode = 0;
                delete scope.currentlyEditing;
            };

            scope.cancelProfileEditing = function () {
                scope.profiles = FilterProfiles.get(scope.namespace);
                scope.profile = {};
                scope.mode = 1;
                delete scope.currentlyEditing;
            };

            scope.closeProfile = function () {
                scope.mode = 0;
                scope.profile = {};
                delete scope.currentlyEditing;
            };

            scope.removeFilterProfile = function (index) {
                scope.profiles.splice(index, 1);
                FilterProfiles.set(scope.namespace, scope.profiles);
            };

            scope.editFilterProfile = function (index) {
                scope.mode = 2;
                scope.profile = scope.profiles[index];
                scope.currentlyEditing = index;
            };

            scope.loadFilterProfile = function (index) {
                if (FilterProfiles.get(scope.namespace)[index]) {
                  var newFilters = [];
                  var filtersFromProfile = FilterProfiles.get(scope.namespace)[index].filter;
                  angular.forEach(filtersFromProfile, function (fvalue, fkey) {
                    newFilters.push({namespace: scope.namespace, key: fkey, value: fvalue});
                  });
                  Storage.replace(newFilters, 'filter');
                }
                scope.mode = 0;
                scope.activeProfile = index;
            };

            // Deregister change handler
            scope.$on('$destroy', function () {
                scope.deregisterChange();
            });

            // React on filter changes
            scope.deregisterChange = Storage.scope.$on('change', function (event, type) {
                if (type === 'filter') {
                    scope.restoreFilters();
                }
            });

        }
    };
}]);
