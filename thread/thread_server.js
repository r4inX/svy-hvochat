/*
 * Serverseitige API von hvochat-thread (laeuft im Servoy-Server, nicht im Browser).
 * Komfortfunktionen zum Pflegen von $scope.model.messages - Servoy sendet bei Aenderungen
 * einzelner Eintraege nur die geaenderten Werte an den Client (geeignet fuer Streaming).
 */

/**
 * Erzeugt eine eindeutige Nachrichten-ID.
 * @return {String}
 */
function createMessageId() {
	return 'm' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
}

/**
 * Liefert den Index einer Nachricht oder -1.
 * @param {String} pcMessageId
 * @return {Number}
 */
function findMessageIndex(pcMessageId) {
	var laMessages = $scope.model.messages;
	if (!laMessages) return -1;
	for (var lnI = 0; lnI < laMessages.length; lnI++) {
		if (laMessages[lnI] && laMessages[lnI].id === pcMessageId) return lnI;
	}
	return -1;
}

/**
 * Fuegt eine Nachricht am Ende des Verlaufs hinzu.
 *
 * @param {String} role user | assistant
 * @param {String} [text] Text (Markdown bei Antworten)
 * @param {String} [status] complete (Standard) | running | error
 * @return {String} ID der neuen Nachricht
 */
$scope.api.addMessage = function(role, text, status) {
	if (!$scope.model.messages) $scope.model.messages = [];
	var lcId = createMessageId();
	$scope.model.messages.push({
		id: lcId,
		role: role || 'assistant',
		text: text || '',
		status: status || 'complete',
		createdAt: new Date()
	});
	return lcId;
};

/**
 * Haengt Text an eine Nachricht an (Streaming).
 *
 * @param {String} messageId
 * @param {String} chunk
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
$scope.api.appendText = function(messageId, chunk) {
	var lnIndex = findMessageIndex(messageId);
	if (lnIndex < 0) return false;
	var loMessage = $scope.model.messages[lnIndex];
	loMessage.text = (loMessage.text || '') + (chunk || '');
	return true;
};

/**
 * Setzt einzelne Felder einer Nachricht (z. B. status, error, sources, reasoning, feedback).
 *
 * @param {String} messageId
 * @param {Object} values Felder und Werte, "id" wird ignoriert
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
$scope.api.updateMessage = function(messageId, values) {
	var lnIndex = findMessageIndex(messageId);
	if (lnIndex < 0 || !values) return false;
	var loMessage = $scope.model.messages[lnIndex];
	for (var lcKey in values) {
		if (lcKey !== 'id') loMessage[lcKey] = values[lcKey];
	}
	return true;
};

/**
 * Liefert eine Nachricht.
 *
 * @param {String} messageId
 * @return {CustomType<hvochat-thread.message>} die Nachricht oder null
 */
$scope.api.getMessage = function(messageId) {
	var lnIndex = findMessageIndex(messageId);
	return lnIndex < 0 ? null : $scope.model.messages[lnIndex];
};

/**
 * Entfernt eine Nachricht.
 *
 * @param {String} messageId
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
$scope.api.removeMessage = function(messageId) {
	var lnIndex = findMessageIndex(messageId);
	if (lnIndex < 0) return false;
	$scope.model.messages.splice(lnIndex, 1);
	return true;
};

/**
 * Leert den Verlauf.
 */
$scope.api.clearMessages = function() {
	$scope.model.messages = [];
};
