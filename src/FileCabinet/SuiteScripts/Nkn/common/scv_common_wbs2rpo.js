/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Huy Pham                Init, create file. Create RPO (Requisition) from Project_WBS, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfjj0)
 */
define(['N/search', 'N/record',
    '../lib/scv_lib_function.js',

    '../cons/scv_cons_search.js',
    '../cons/scv_cons_format.js',

    '../cons/scv_cons_search_wbs2rpo_01.js',
    '../cons/scv_cons_search_wbs2rpo_02.js',
    '../cons/scv_cons_search_wbs2rpo_03.js',
], (search, record,
    lbf,

    constSearch,
    constFormat,

    constSearchWbs2Rpo01,
    constSearchWbs2Rpo02,
    constSearchWbs2Rpo03,
) => {
    const Stores = {
        SalesTaxItem: {},
    }

    const getListSavedSearch = () => {
        return [
            constSearchWbs2Rpo01.ID, constSearchWbs2Rpo02.ID,
            constSearchWbs2Rpo03.ID
        ];
    }

    const getColumns = (params) => {
        let arrSalesTaxItem = getSalesTaxItem(params);

        setStoresSalesTaxItem(arrSalesTaxItem);

        let arrResult = [
            {
                id: "custpage_col_chk", label: "Select", type: "checkbox", displayType: "entry",
            },
            {
                id: "custpage_col_projectcode", label: "Project Code", type: "text"
            },
            {
                id: "custpage_col_workitemcode", label: "Work Item Code", type: "text"
            },
            {
                id: "custpage_col_item", label: "Item", type: "text"
            },
            {
                id: "custpage_col_description", label: "Description", type: "textarea", displayType: "entry",
            },
            {
                id: "custpage_col_classcode", label: "Class Code", type: "select", source: "classification", displayType: "entry",
            },
            {
                id: "custpage_col_unit", label: "Unit", type: "select", source: "-221", displayType: "entry",
            },
            {
                id: "custpage_col_rpo_qty", label: "RPO Quantity", type: "float", displayType: "entry",
            },
            {
                id: "custpage_col_rpo_rate", label: "RPO Rate", type: "float", displayType: "entry",
            },
            {
                id: "custpage_col_rpo_tax", label: "RPO Tax", type: "select", displayType: "entry",
                lookup: {
                    data: arrSalesTaxItem,
                    valueExpr: "internalid",
                    displayExpr: "name",
                },
            },
            {
                id: "custpage_col_vendor", label: "Vendor", type: "select", displayType: "entry",
                lookup: {
                    data: getVendors(params),
                    valueExpr: "internalid",
                    displayExpr: "name",
                },
            },
            {
                id: "custpage_col_rpo_amount", label: "RPO Amount", type: "float", displayType: "entry",
            },
            {
                id: "custpage_col_rpo_taxamount", label: "RPO Tax Amount", type: "float", displayType: "entry",
            },
            {
                id: "custpage_col_wbs_qty", label: "WBS Quantity", type: "float"
            },
            {
                id: "custpage_col_wbs_amount", label: "WBS Amount", type: "float"
            },
            {
                id: "custpage_col_linekey", label: "Line Key", type: "text"
            },
            {
                id: "custpage_col_customdata", label: "Columns Custom", type: "textarea", displayType: "hidden",
            },
        ]

        return arrResult;
    }

    const addBtnCreateRPO = () => {

    }

    const initParamsDefault = (params) => {
        if (params.custpage_project) {
            let arrProject01 = constSearchWbs2Rpo01.getDataSource({
                internalid: params.custpage_project,
                subsidiary: params.custpage_subsidiary,
            });
            if (arrProject01.length > 0) {
                params.custpage_def_currency = arrProject01[0]?.project_currency;
            }
        }
    }

    const setStoresSalesTaxItem = (datas) =>{
        datas.forEach(data => {
            Stores.SalesTaxItem[data.internalid] = {...data};
        })
    }

    const getDataSource = (params) => {
        let arrWbsDetail02 = constSearchWbs2Rpo02.getDataSource({
            project: params.custpage_project,
            subsidiary: params.custpage_subsidiary,
            projectmanager: params.custpage_employee,
        });

        let arrRpo03 = constSearchWbs2Rpo03.getDataSource({
            project: params.custpage_project,
            subsidiary: params.custpage_subsidiary,
        });

        let arrResult = [];

        for (let i = 0; i < arrWbsDetail02.length; i++) {
            let objWbsDetail02 = arrWbsDetail02[i];

            let objRes = {
                custpage_col_chk: "F",
                custpage_col_projectcode: objWbsDetail02?.project_code,
                custpage_col_workitemcode: objWbsDetail02?.line_work_item_code_display ?? objWbsDetail02?.line_work_item_code,
                custpage_col_item: objWbsDetail02?.line_item_display ?? objWbsDetail02?.line_item,
                custpage_col_description: objWbsDetail02.line_name,
                custpage_col_classcode: objWbsDetail02.line_class_code,
                custpage_col_unit: objWbsDetail02?.line_units,
                custpage_col_rpo_qty: objWbsDetail02.line_quantity * 1,
                custpage_col_rpo_rate: objWbsDetail02.line_rate * 1,
                custpage_col_rpo_tax: "",
                custpage_col_vendor: "",
                custpage_col_rpo_amount: 0,
                custpage_col_rpo_taxamount: 0,
                custpage_col_wbs_qty: objWbsDetail02.line_quantity * 1,
                custpage_col_wbs_amount: objWbsDetail02.line_amount * 1,
                custpage_col_linekey: objWbsDetail02.line_key,
                custpage_col_customdata: {
                    wbs_internalid: objWbsDetail02.wbs_internalid,
                    project_segment: objWbsDetail02.project_segment,
                    line_item: objWbsDetail02.line_item,
                    line_work_item_code: objWbsDetail02.line_work_item_code,
                }
            };

            let arrRpo03_detail = arrRpo03.filter(e => e.pr_project_segment == objWbsDetail02.project_segment
                && e.pr_line_key == objWbsDetail02.line_key);
            arrRpo03_detail.forEach(objRpo03 =>{
                objRes.custpage_col_rpo_qty -= objRpo03.pr_quantity * 1;
            })

            if(objRes.custpage_col_rpo_qty <= 0) continue;

            calcRpoAmount(objRes);
            calcRpoTaxAmount(objRes);

            objRes.custpage_col_customdata = JSON.stringify(objRes.custpage_col_customdata);

            arrResult.push(objRes);
        }

        return arrResult;
    }

    const calcRpoAmount = (objLine) =>{
        objLine.custpage_col_rpo_amount = constFormat.roundNumber(objLine.custpage_col_rpo_qty * objLine.custpage_col_rpo_rate);

        return objLine.custpage_col_rpo_amount;
    }

    const calcRpoTaxAmount = (objLine) =>{
        let taxRate = 0 ;

        if(objLine.custpage_col_rpo_tax && Stores.SalesTaxItem[objLine.custpage_col_rpo_tax]?.rate){
            taxRate = Stores.SalesTaxItem[objLine.custpage_col_rpo_tax].rate.replace("%", "") / 100;
        }

        objLine.custpage_col_rpo_taxamount = constFormat.roundNumber(objLine.custpage_col_rpo_amount * taxRate);

        return objLine.custpage_col_rpo_taxamount;
    }

    const createRPO = (params, arrLines) => {
        let rpoRec = record.create({type: "purchaserequisition", isDynamic: true});

        let objLinesFirts = arrLines[0];
        let objWbsDetail02_First = JSON.parse(objLinesFirts.custpage_col_customdata);
        let vendorId = params.custpage_def_vendor;

        lbf.setValueData(rpoRec, [
            "subsidiary", "cseg_scv_sg_proj",
            "custbody_scv_scope_of_work", 
        ], [
            params.custpage_subsidiary, objWbsDetail02_First.project_segment,
            params.custpage_def_scopeofwork, 
        ]);

        let sublistId = "item";

        for(let i = 0; i < arrLines.length; i++){
            let objLine = arrLines[i];

            let objCustomData = JSON.parse(objLinesFirts.custpage_col_customdata);

            rpoRec.selectNewLine(sublistId);

            lbf.setCurrentSublistValueData(rpoRec, sublistId, [
                "item", "povendor", 
                "description", "cseg_paactivitycode",
                "cseg_scv_sg_proj", "customer",
                "class", "units",
                "quantity", "estimatedrate",
                "custcol_scv_rpo_tax", "custcol_scv_ori_lineid",
            ], [
                objCustomData.line_item, objLine.custpage_col_vendor || vendorId, 
                objLine.custpage_col_description, objCustomData.line_work_item_code,
                objCustomData.project_segment, params.custpage_project,
                objLine.custpage_col_classcode, objLine.custpage_col_unit,
                objLine.custpage_col_rpo_qty, objLine.custpage_col_rpo_rate,
                objLine.custpage_col_rpo_tax, objLine.custpage_col_linekey,
            ]);

            rpoRec.commitLine(sublistId);
        }

        let rpoRecId = rpoRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        
        return rpoRecId;
    }

    const getVendors = (_params) => {
        let filters = [];

        if (!!_params.custpage_subsidiary) {
            filters.push(search.createFilter({
                name: 'internalid',
                join: 'msesubsidiary',
                operator: "anyof",
                values: _params.custpage_subsidiary.split(",")
            }));
        }

        let resultSearch = constSearch.createSearchWithFilter({
            type: "vendor",
            filters: [
                ["isinactive", "is", "F"]
            ],
            columns: [
                "internalid",
                {
                    name: "formulatext",
                    formula: "{entityid} || ' ' || {altname}"
                }
            ]
        }, filters);

        resultSearch = resultSearch.runPaged({ pageSize: 1000 });

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function (_objTmpl, _column) {
            return constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                "internalid", "name"
            ]);
        });

        return arrResult;
    }

    const getSalesTaxItem = (_params) => {
        let filters = [];

        if (!!_params.custpage_subsidiary) {
            filters.push(search.createFilter({
                name: 'subsidiary',
                operator: "anyof",
                values: _params.custpage_subsidiary.split(",")
            }));
        }

        let resultSearch = constSearch.createSearchWithFilter({
            type: "salestaxitem",
            filters: [
                ["isinactive", "is", "F"]
            ],
            columns: [
                "internalid", "name", "rate",
            ]
        }, filters);

        resultSearch = resultSearch.runPaged({ pageSize: 1000 });

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function (_objTmpl, _column) {
            return constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                "internalid", "name", "rate"
            ]);
        });

        return arrResult;
    }

    return {
        getListSavedSearch,
        getVendors,
        getSalesTaxItem,
        initParamsDefault,
        setStoresSalesTaxItem,

        calcRpoAmount,
        calcRpoTaxAmount,

        getColumns,
        addBtnCreateRPO,
        getDataSource,
        createRPO,
    };

});
