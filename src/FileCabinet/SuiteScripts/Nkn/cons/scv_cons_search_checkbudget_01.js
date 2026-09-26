/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], (search,

    constSearch
) => {
    const TYPE = "wbs";
    const ID = "customsearch_scv_budget_wbs";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];

        if (_params.subsidiary) {
            filters.push(search.createFilter({
                name: 'subsidiary', join: 'job', operator: 'anyof', values: _params.subsidiary.toString().split(",")
            }));
        }

        if (_params.cseg_scv_sg_proj) {
            filters.push(search.createFilter({
                name: 'cseg_scv_sg_proj', join: 'job', operator: 'anyof', values: _params.cseg_scv_sg_proj.toString().split(",")
            }));
        }

        if (_params.cseg_paactivitycode) {
            filters.push(search.createFilter({
                name: 'cseg_paactivitycode', join: 'li', operator: 'anyof', values: _params.cseg_paactivitycode.toString().split(",")
            }));
        }

        return constSearch.getDataSource(ID, filters, [], Records);
    };

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
