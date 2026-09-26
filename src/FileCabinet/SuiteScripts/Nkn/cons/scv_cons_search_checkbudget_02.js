/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Sep 2026         Huy Pham			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js",
    "../cons/scv_cons_format.js",
], (search,

    constSearch,
    constFormat,
) => {
    const TYPE = "transaction";
    const ID = "customsearch_scv_budget_transaction";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];

		if (_params.subsidiary) {
            filters.push(search.createFilter({
                name: 'subsidiary', operator: 'anyof', values: _params.subsidiary.toString().split(",")
            }));
        }

        if (_params.cseg_scv_sg_proj) {
            filters.push(search.createFilter({
                name: 'cseg_scv_sg_proj', operator: 'anyof', values: _params.cseg_scv_sg_proj.toString().split(",")
            }));
        }

        if (_params.cseg_paactivitycode) {
            filters.push(search.createFilter({
                name: 'cseg_paactivitycode', join: 'line', operator: 'anyof', values: _params.cseg_paactivitycode.toString().split(",")
            }));
        }

        if (_params.datecreated_YYYYMMDDHH24MISS) {
            filters.push(search.createFilter({
                name: 'formulanumeric',
                formula: `TO_CHAR({datecreated}, 'YYYYMMDDHH24MISS')`,
                operator: 'lessthanorequalto',
                values: _params.datecreated_YYYYMMDDHH24MISS
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
