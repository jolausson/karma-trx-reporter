var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');
var newGuid =  require('./helpers/helpers').newGuid;
var getTimestamp = require('./helpers/helpers').getTimestamp;
var formatDuration = require('./helpers/helpers').formatDuration;

var TRXReporter = function (baseReporterDecorator, config, emitter, logger, helper, formatError) {
    var outputFile = config.outputFile;
    var shortTestName = !!config.shortTestName;
    var log = logger.create('reporter.trx');
    var hostName = require('os').hostname();
    var testRun;
    var resultSummary;
    var counters;
    var testDefinitions;
    var testListIdNotInAList;
    var testEntries;
    var results;
    var times;

    baseReporterDecorator(this);

    this.onRunStart = function () {
        var userName = process.env.USERNAME || process.env.USER;
        var runStartTimestamp = getTimestamp();
        testRun = builder.create("TestRun", {version: '1.0', encoding: 'UTF-8'})
            .att('id', newGuid())
            .att('name', userName + '@' + hostName + ' ' + runStartTimestamp)
            .att('runUser', userName)
            .att('xmlns', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');

        testRun.ele('TestSettings')
            .att('name', 'Karma Test Run')
            .att('id', newGuid());

        times = testRun.ele('Times')
        times.att('creation', runStartTimestamp)
        times.att('queuing', runStartTimestamp)
        times.att('start', runStartTimestamp);

        resultSummary = testRun.ele('ResultSummary');
        counters = resultSummary.ele('Counters');
        testDefinitions = testRun.ele('TestDefinitions');

        testListIdNotInAList = "8c84fa94-04c1-424b-9868-57a2d4851a1d";
        var testLists = testRun.ele('TestLists');

        testLists.ele('TestList')
            .att('name', 'Results Not in a List')
            .att('id', testListIdNotInAList);

        // seems to be VS is expecting that exact id
        testLists.ele('TestList')
            .att('name', 'All Loaded Results')
            .att('id', "19431567-8539-422a-85d7-44ee4e166bda");

        testEntries = testRun.ele('TestEntries');
        results = testRun.ele('Results');
    };

    this.onBrowserStart = function(browser) {
    };

    this.onBrowserComplete = function (browser) {
        var result = browser.lastResult;

        var passed = result.failed <= 0 && !result.error;
        resultSummary.att('outcome', passed ? 'Passed' : 'Failed');

        // todo: checkout if all theses numbers map well
        counters.att('total', result.total)
            .att('executed', result.total - result.skipped)
            .att('passed', result.success)
            .att('error', result.error ? 1 : 0)
            .att('failed', result.failed);

        // possible useful info:
        // todo: result.disconnected => this seems to happen occasionally? => Possibly handle it!
        // (result.netTime || 0) / 1000)
    };

    this.onRunComplete = function () {
        times.att('finish', getTimestamp());
        var xmlToOutput = testRun;

        helper.mkdirIfNotExists(path.dirname(outputFile), function () {
            fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function (err) {
                if (err) {
                    log.warn('Cannot write TRX testRun\n\t' + err.message);
                } else {
                    log.debug('TRX results written to "%s".', outputFile);
                }
            });
        });
    };

    this.specSuccess = this.specSkipped = this.specFailure = function (browser, result) {
        var unitTestId = newGuid();
        var unitTestName = shortTestName
            ? result.description
            : browser.name + '_' + result.description;
        var className = result.suite.join('.');
        var codeBase = className + '.' + unitTestName;

        var suite = className = result.suite.join(' > ');
        var unitTest = testDefinitions.ele('UnitTest')
            .att('name', suite + ' > ' + unitTestName)
            .att('id', unitTestId);
        var executionId = newGuid();
        unitTest.ele('Execution')
            .att('id', executionId);
        unitTest.ele('TestMethod')
            .att('codeBase', codeBase)
            .att('name', unitTestName)
            .att('className', className);

        testEntries.ele('TestEntry')
            .att('testId', unitTestId)
            .att('executionId', executionId)
            .att('testListId', testListIdNotInAList);

        var unitTestResult = results.ele('UnitTestResult')
            .att('executionId', executionId)
            .att('testId', unitTestId)
            .att('testName', unitTestName)
            .att('computerName', hostName)
            .att('duration', formatDuration(result.time || 0))
            .att('startTime', getTimestamp())
            .att('endTime', getTimestamp())
            // todo: are there other test types?
            .att('testType', '13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b') // that guid seems to represent 'unit test'
            .att('outcome', result.skipped ? 'NotExecuted' : (result.success ? 'Passed' : 'Failed'))
            .att('testListId', testListIdNotInAList);

        if (!result.success) {
            unitTestResult.ele('Output')
                .ele('ErrorInfo')
                .ele('Message', formatError(result.log[0]))
        }
    };
};

TRXReporter.$inject = ['baseReporterDecorator', 'config.trxReporter', 'emitter', 'logger',
    'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
    'reporter:trx': ['type', TRXReporter]
};
