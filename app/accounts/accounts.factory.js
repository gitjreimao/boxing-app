(function() {
    'use strict';
    
    angular
        .module('app')
        .factory('AccountsFactory', factory);
    
    factory.$inject = ['$resource', 'AppSettings'];
    
    /* @ngInject */
    function factory($resource, AppSettings) {
        return $resource(AppSettings.apiUrl + '/accounts/:id/', {}, { query: { } });
    }
})();
