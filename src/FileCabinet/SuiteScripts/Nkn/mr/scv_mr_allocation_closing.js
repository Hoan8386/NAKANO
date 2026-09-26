/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/format', 'N/record', 'N/runtime', 'N/search', '../lib/scv_lib_function.js'],

    (format, record, runtime, search, libFunc) => {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        const getInputData = () => {
            let currentScript = runtime.getCurrentScript();
            let template = currentScript.getParameter({name: 'custscript_scv_mr_closing_altemplate'});
            let year_month = currentScript.getParameter({name: 'custscript_scv_mr_closing_year_month'});
            //let datebasis = currentScript.getParameter({name : 'custscript_scv_mr_closing_datebasis'});
            let timezone = currentScript.getParameter({name: 'custscript_scv_mr_closing_timezone'});
            let trandate = currentScript.getParameter({name: 'custscript_scv_mr_closing_trandate'});
            let ordertype = currentScript.getParameter({name: 'custscript_scv_mr_closing_ordertype'});
            let memo = currentScript.getParameter({name: 'custscript_scv_mr_closing_memo'});
            let subsidiary = currentScript.getParameter({name: 'custscript_scv_mr_closing_subsidiary'});

            let delimiter = /\u0005/;
            let arrObj = [], recT, allocation_sub;
            if (template && year_month && subsidiary) {
                template = template.split(delimiter);
                let subs = subsidiary.split(delimiter);
                let lT = template.length;
                let lS = subs.length;
                for (let i = 0; i < lT; i++) {
                    recT = record.load({type: 'customrecord_scv_altem', id: template[i]});
                    allocation_sub = recT.getValue('custrecord_scv_allocation_sub');
                    if (allocation_sub) {
                        arrObj.push({
                            template: template[i],
                            year_month: year_month,
                            timezone: timezone,
                            trandate: trandate,
                            ordertype: libFunc.reValue(ordertype),
                            memo: libFunc.reValue(memo),
                            subsidiary: subsidiary
                        });
                    } else {
                        for (let j = 0; j < lS; j++) {
                            arrObj.push({
                                template: template[i],
                                year_month: year_month,
                                timezone: timezone,
                                trandate: trandate,
                                ordertype: libFunc.reValue(ordertype),
                                memo: libFunc.reValue(memo),
                                subsidiary: subs[j]
                            });
                        }
                    }
                }
            }
            return arrObj;
        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        const map = (context) => {
            let valueS = context.value;
            let tpl = JSON.parse(valueS);
            let lineTemplate = makeLineTemplate(tpl.template, tpl.year_month, tpl.timezone, tpl.trandate, tpl.ordertype, tpl.memo, tpl.subsidiary);
            let llT = lineTemplate.length;
            for (let i = 0; i < llT; i++) {
                context.write({key: i, value: lineTemplate[i]});
            }
        }

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        const reduce = (context) => {
            let vlS = context.values;
            let lVls = vlS.length;
            let lineTemplate;
            for (let s = 0; s < lVls; s++) {
                lineTemplate = JSON.parse(vlS[s]);
                createAllocationEntry(lineTemplate);
                log.error('lineTemplate', lineTemplate);
            }
        }

        const pushFilter = (f, datebasis, timezone, trandate, subsidiary) => {
            let par_trandate = format.parse({value: trandate, type: format.Type.DATE, timezone: timezone});
            par_trandate.setDate(1);
            par_trandate = format.format({value: par_trandate, type: format.Type.DATE});
            let f1 = search.createFilter({name: 'trandate', operator: search.Operator.ONORBEFORE, values: trandate});
            let f2 = search.createFilter({name: 'trandate', operator: search.Operator.ONORAFTER, values: par_trandate});
            let delimiter = /\u0005/;
            let f3 = null;
            if (isOneWorld()) {
                f3 = search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: subsidiary.split(delimiter)
                });
            }
            if (String(datebasis) === '1') {
                f.push(f1);
                f.push(f2);
                if (f3) {
                    f.push(f3);
                }
            } else if (String(datebasis) === '2') {
                f.push(f1);
                if (f3) {
                    f.push(f3);
                }
            } else if (String(datebasis) === '3' && f3) {
                //none
                f.push(f3);
            }
        }

        const isOneWorld = () => {
            return runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});
        }

        const makeLineTemplate = (template, year_month, timezone, trandate, ordertype, memo, subsidiary) => {
            let recTemplate = record.load({type: 'customrecord_scv_altem', id: template});
            let ssSource = recTemplate.getValue('custrecord_scv_allocation_source');
            let ssTieuthuc = recTemplate.getValue('custrecord_scv_allocation_h');
            ordertype = recTemplate.getValue('custrecord_scv_allocation_order_type');
            let allocation_status = recTemplate.getValue('custrecord_scv_allocation_status');
            let allocation_sub = recTemplate.getValue('custrecord_scv_allocation_sub');

            let slAllcationDetail = 'recmachcustrecord_scv_altem';
            let fieldFieldId = 'custrecord_scv_altem_fieldid';
            let fieldFilterH = 'custrecord_scv_altem_filterh';
            let fieldValueDest = 'custrecord_scv_altem_valuedest';
            let fieldValueDestId = 'custrecord_scv_altem_valuedestid';
            let fieldDest = 'custrecord_scv_altem_dest';
            let fieldFomula = 'custrecord_scv_altem_formula';
            let fieldFomulaName = 'custrecord_scv_altem_formula_name';

            let lcAllcationDetail = recTemplate.getLineCount(slAllcationDetail);
            let arrAllcationDetail = [], valuedest, valuedestid, fieldid, filterh, dest, formula;
            let fieldFilter = [];
            for (let i = 0; i < lcAllcationDetail; i++) {
                valuedest = recTemplate.getSublistValue({
                    sublistId: slAllcationDetail,
                    fieldId: fieldValueDest,
                    line: i
                });
                valuedestid = recTemplate.getSublistValue({
                    sublistId: slAllcationDetail,
                    fieldId: fieldValueDestId,
                    line: i
                });
                fieldid = recTemplate.getSublistValue({sublistId: slAllcationDetail, fieldId: fieldFieldId, line: i});
                filterh = recTemplate.getSublistValue({sublistId: slAllcationDetail, fieldId: fieldFilterH, line: i});
                dest = recTemplate.getSublistValue({sublistId: slAllcationDetail, fieldId: fieldDest, line: i});
                formula = recTemplate.getSublistValue({sublistId: slAllcationDetail, fieldId: fieldFomula, line: i});
                let formulaname = recTemplate.getSublistValue({
                    sublistId: slAllcationDetail,
                    fieldId: fieldFomulaName,
                    line: i
                });
                arrAllcationDetail.push({
                    valueDest: valuedest,
                    valuedestid: valuedestid,
                    fieldid: fieldid,
                    filterh: filterh,
                    dest: dest,
                    formula: formula,
                    formulaname: formulaname
                });
                if (filterh === true || filterh === 'T') {
                    fieldFilter.push({fieldid: fieldid, formula: formula, formulaname: formulaname});
                }
            }

            let pgSize = 1000;
            let sSource = search.load(ssSource);
            let fSource = sSource.filters;
            pushFilter(fSource, recTemplate.getValue('custrecord_scv_allocation_sdaterule'), timezone, trandate, subsidiary);
            let hdaterule = recTemplate.getValue('custrecord_scv_allocation_hdaterule');
            sSource.filters = fSource;
            let cSource = sSource.columns;
            let lcSource = cSource.length;
            let rSource;
            try {
                rSource = sSource.runPaged({pageSize: pgSize});
            } catch (e) {
                rSource = sSource.runPaged({pageSize: pgSize});
            }
            let numPage = rSource.pageRanges.length;
            let searchPage, tempData, numTemp, tempValue, objData, nameTemp, label;
            let lineTemplate = [];
            for (let np = 0; np < numPage; np++) {
                searchPage = rSource.fetch({index: np});
                tempData = searchPage.data;
                if (tempData) {
                    numTemp = tempData.length;
                    for (let i = 0; i < numTemp; i++) {
                        objData = {};
                        for (let j = 0; j < lcSource; j++) {
                            tempValue = getValueRow(tempData[i], cSource[j])
                            nameTemp = cSource[j].name;
                            label = cSource[j].label;
                            if (nameTemp === 'amount') {
                                objData[nameTemp] = tempValue * 1;
                            } else if (isFormulaField(nameTemp)) {
                                if (label) {
                                    objData[nameTemp + '_' + label] = tempValue;
                                }
                            } else {
                                objData[nameTemp] = tempValue;
                            }
                        }
                        if (!objData.amount) {
                            objData.amount = tempData[i].getValue(cSource[lcSource - 1]) * 1;
                        }
                        if (Number(objData.amount || 0) !== 0) {
                            lineTemplate.push({
                                ssTieuthuc: ssTieuthuc,
                                arrAllcationDetail: arrAllcationDetail,
                                fieldFilter: fieldFilter,
                                objData: objData,
                                year_month: year_month,
                                template: template,
                                timezone: timezone,
                                trandate: trandate,
                                hdaterule: hdaterule,
                                ordertype: ordertype,
                                memo: memo,
                                subsidiary: subsidiary,
                                allocation_status: allocation_status,
                                allocation_sub: allocation_sub || subsidiary
                            });
                        }
                    }
                }
            }

            return lineTemplate;
        }

        const getValueRow = (rowData, col) => {
            let vrNone = '- None -';
            let tempValue = rowData.getValue(col);
            if (tempValue === vrNone) {
                tempValue = '';
            }
            return tempValue;
        }

        const createAllocationEntry = (lineTemplate) => {
            let ssTieuthuc = lineTemplate.ssTieuthuc;
            let sTieuthuc = search.load(ssTieuthuc);
            let cTieuthuc = sTieuthuc.columns;
            let lcTieuthuc = cTieuthuc.length;
            let fTieuThuc = sTieuthuc.filters;

            pushFilter(fTieuThuc, lineTemplate.hdaterule, lineTemplate.timezone, lineTemplate.trandate, lineTemplate.subsidiary);
            let objData = lineTemplate.objData, vData;
            let arrAllcationDetail = lineTemplate.arrAllcationDetail;
            let fieldFilter = lineTemplate.fieldFilter;
            let lFF = fieldFilter.length, objFilter, nameFilter;
            for (let i = 0; i < lFF; i++) {
                objFilter = fieldFilter[i];
                nameFilter = objFilter.fieldid;
                vData = objData[nameFilter];
                if (objFilter.formula) {
                    vData = objData[objFilter.formulaname + '_' + nameFilter];
                    if (!vData) {
                        fTieuThuc.push(search.createFilter({
                            name: objFilter.formulaname,
                            operator: search.Operator.ISEMPTY,
                            values: '',
                            formula: objFilter.formula
                        }));
                    } else {
                        fTieuThuc.push(search.createFilter({
                            name: objFilter.formulaname,
                            operator: getOperatorByFormulaName(objFilter.formulaname),
                            values: vData,
                            formula: objFilter.formula
                        }));
                    }
                } else {
                    if (nameFilter.substring(0, 4) === 'cseg') {
                        nameFilter = 'line.' + nameFilter;
                    }
                    if (!vData) {
                        vData = '@NONE@';
                    }
                    fTieuThuc.push(search.createFilter({
                        name: nameFilter,
                        operator: search.Operator.ANYOF,
                        values: vData
                    }));
                }
            }
            sTieuthuc.filters = fTieuThuc;
            let rTieuthuc, pgSize = 1000;
            try {
                rTieuthuc = sTieuthuc.runPaged({pageSize: pgSize});
            } catch (e) {
                log.error('exception', e);
                rTieuthuc = sTieuthuc.runPaged({pageSize: pgSize});
            }
            let total = getTotal(rTieuthuc, cTieuthuc, lcTieuthuc);
            if (total !== 0) {
                let line = 0;
                let recAllocationEntry = record.create({type: 'customtransaction_scv_closing_entry'});

                let trandate = format.parse({value: lineTemplate.trandate, type: format.Type.DATE});
                let alField = ['transtatus', 'trandate', 'custbody_scv_altem', 'custbody_scv_order_type', 'memo', 'subsidiary'];
                libFunc.setValueData(recAllocationEntry, alField, [lineTemplate.allocation_status, trandate, lineTemplate.template, lineTemplate.ordertype, lineTemplate.memo, lineTemplate.allocation_sub]);

                insertLineSource(recAllocationEntry, line, objData);
                line++;
                let numPage = rTieuthuc.pageRanges.length;
                let searchPage, tempData, numTemp;
                lcTieuthuc = lcTieuthuc - 1;
                let isPhanbu = false, totalLineTieuthuc = 0;
                for (let np = 0; np < numPage; np++) {
                    searchPage = rTieuthuc.fetch({index: np});
                    tempData = searchPage.data;
                    if (tempData) {
                        numTemp = tempData.length;
                        for (let i = 0; i < numTemp; i++) {
                            if (np === numPage - 1 && i === numTemp - 1) {
                                isPhanbu = true;
                            }
                            totalLineTieuthuc = insertLineTieuthuc(recAllocationEntry, line, objData, total, totalLineTieuthuc, arrAllcationDetail, tempData[i], cTieuthuc, lcTieuthuc, isPhanbu);
                            line++;
                        }
                    }
                }
                try {
                    recAllocationEntry.save({enableSourcing: true, ignoreMandatoryFields: true});
                } catch (e) {
                    log.error('exception save:', e);
                }
            }
        }

        const insertLineSource = (recAllocationEntry, line, objData) => {
            let slLine = 'line', fieldTemp;
            recAllocationEntry.insertLine({sublistId: slLine, line: line});
            let nameTemp, index;
            for (let key in objData) {
                if (key.substring(0, 5) === 'line.') {
                    fieldTemp = key.substring(5, key.length);
                } else if (key === 'amount') {
                    fieldTemp = 'credit';
                } else {
                    fieldTemp = key;
                }
                if (key === 'amount') {
                    recAllocationEntry.setSublistValue({
                        sublistId: slLine,
                        fieldId: fieldTemp,
                        value: objData[key],
                        line: line
                    });
                } else {
                    index = key.indexOf('_');
                    nameTemp = '';
                    if (index !== -1) {
                        nameTemp = key.substring(0, index);
                    }
                    if (isFieldNameOrFormulaNumeric(nameTemp)) {
                        if (nameTemp === 'formulanumeric') {
                            fieldTemp = key.substring(index + 1);
                        }
                        recAllocationEntry.setSublistValue({
                            sublistId: slLine,
                            fieldId: fieldTemp,
                            value: objData[key],
                            line: line
                        });
                    }
                }
            }
        }

        const insertLineTieuthuc = (recAllocationEntry, line, objData, total, totalLineTieuthuc, arrAllcationDetail, rowTieuthuc, cTieuthuc, lcTieuthuc, isPhanbu) => {
            let slLine = 'line', fieldTemp;
            recAllocationEntry.insertLine({sublistId: slLine, line: line});

            let vTieuthuc = rowTieuthuc.getValue(cTieuthuc[lcTieuthuc]) * 1;
            let pcTieuthuc = 0, amount, vField = '';
            if (isPhanbu === false) {
                pcTieuthuc = vTieuthuc / total;
            }
            let nameTemp, index;
            let lAll = arrAllcationDetail.length;
            for (let a = 0; a < lAll; a++) {
                fieldTemp = arrAllcationDetail[a].fieldid;
                vField = ''
                if (arrAllcationDetail[a].valuedestid) {
                    vField = arrAllcationDetail[a].valuedestid;
                } else if (String(arrAllcationDetail[a].dest) === '1') {
                    for (let key in objData) {
                        index = key.indexOf('_');
                        nameTemp = '';
                        if (index !== -1) {
                            nameTemp = key.substring(0, index);
                        }
                        if (isFieldNameOrFormulaNumeric(nameTemp)) {
                            if (nameTemp === 'formulanumeric') {
                                nameTemp = key.substring(index + 1);
                            } else {
                                nameTemp = key;
                            }
                        }
                        if (key.substring(0, 5) === 'line.') {
                            nameTemp = key.substring(5, key.length);
                        }
                        if (fieldTemp === nameTemp) {
                            vField = objData[key];
                        }
                    }
                } else if (String(arrAllcationDetail[a].dest) === '2') {
                    for (let m = 0; m < lcTieuthuc; m++) {
                        let name = cTieuthuc[m].name;
                        let label = cTieuthuc[m].label;
                        if (isFormulaField(name)) {
                            if (fieldTemp === label) {
                                vField = getValueRow(rowTieuthuc, cTieuthuc[m]);
                            }
                        } else {
                            if (fieldTemp === name) {
                                vField = getValueRow(rowTieuthuc, cTieuthuc[m]);
                            }
                        }
                    }
                }
                if (vField) {
                    recAllocationEntry.setSublistValue({
                        sublistId: slLine,
                        fieldId: fieldTemp,
                        value: vField,
                        line: line
                    });
                }
            }
            /*if(objData.amount > 0) {
                fieldTemp = 'debit';
            } else {
                fieldTemp = 'credit';
            }*/
            fieldTemp = 'debit';
            if (isPhanbu) {
                amount = objData.amount - totalLineTieuthuc;
            } else {
                amount = Math.round(pcTieuthuc * objData.amount);
            }
            recAllocationEntry.setSublistValue({sublistId: slLine, fieldId: fieldTemp, value: amount, line: line});

            return totalLineTieuthuc + amount;
        }

        const isFieldNameOrFormulaNumeric = (nameTemp) => {
            return (nameTemp !== 'formulatext' && nameTemp !== 'formulacurrency' && nameTemp !== 'formuladate' && nameTemp !== 'formuladatetime' && nameTemp !== 'formulapercent');
        }

        const isFormulaField = (name) => {
            return (name === 'formulatext' || name === 'formulacurrency' || name === 'formuladate' || name === 'formuladatetime' || name === 'formulanumeric' || name === 'formulapercent');
        }

        const getTotal = (rTieuthuc, cTieuthuc, lcTieuthuc) => {
            let numPage = rTieuthuc.pageRanges.length;
            let searchPage, tempData, numTemp, tempValue, total = 0;
            for (let np = 0; np < numPage; np++) {
                searchPage = rTieuthuc.fetch({index: np});
                tempData = searchPage.data;
                if (tempData) {
                    numTemp = tempData.length;
                    for (let i = 0; i < numTemp; i++) {
                        tempValue = tempData[i].getValue(cTieuthuc[lcTieuthuc - 1]) * 1;
                        total = total + tempValue;
                    }
                }
            }
            return total;
        }

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        const summarize = (summary) => {

        }

        /**
         * Lấy toán tử phù hợp theo loại formulaname
         * @param {string} formulaname - Loại công thức (formulanumeric, formulatext, formuladate, formuladatetime, formulacurrency, formulapercent)
         * @return {string} Toán tử search phù hợp
         */
        const getOperatorByFormulaName = (formulaname) => {
            switch (formulaname) {
                case 'formulanumeric':
                case 'formulacurrency':
                case 'formulapercent':
                    return search.Operator.EQUALTO;
                case 'formuladate':
                case 'formuladatetime':
                    return search.Operator.ON;
                case 'formulatext':
                default:
                    return search.Operator.IS;
            }
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        };

    });
