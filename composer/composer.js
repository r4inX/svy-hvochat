// NG1-Stub: wird nur vom alten NG1-Client verwendet. Das Package ist Titanium-only,
// die Spec referenziert diese Datei aber weiterhin ueber "definition".
angular.module('{{NG1_NAME}}', ['servoy']).directive('{{NG1_NAME}}', function() {
	return {
		restrict: 'E',
		scope: { model: '=svyModel', api: '=svyApi', handlers: '=svyHandlers' },
		template: '<div>hvochat-composer: nur im Titanium-Client verfuegbar</div>'
	};
});
