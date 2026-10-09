/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  16 Sep 2026         Thanh Hoan			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], function (search,
    
    constSearch
) {
    const TYPE = "vendorbill";
    const ID = "customsearch_scv_prev_apv_amt_id";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = createFiltersFromParams(_params);

        return constSearch.getDataSource_Mixed(ID, filters, [], Records);
    };

    const createFiltersFromParams = (_params) => {
        const filters = [];

        if (_params.internalid) {
			filters.push(search.createFilter({
				name: 'internalid', operator: 'anyof', values: _params.internalid
			}));
		}

        return filters;
    }

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
