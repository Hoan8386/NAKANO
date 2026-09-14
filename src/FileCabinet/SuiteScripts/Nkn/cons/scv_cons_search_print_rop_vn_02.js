/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Sep 2026         Thanh Hoan			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], function (search,
    
    constSearch
) {
    const TYPE = "vendorbill";
    const ID = "customsearch_scv_prev_apv_amt_vn";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];
        return constSearch.getDataSource_Mixed(ID, filters, [], Records);
    };

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
