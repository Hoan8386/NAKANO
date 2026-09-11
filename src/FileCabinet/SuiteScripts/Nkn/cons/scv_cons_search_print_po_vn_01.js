/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Thanh Hoan			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], function (search,
    
    constSearch
) {
    const TYPE = "transaction";
    const ID = "customsearch_scv_poprintform_vn";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = [];

		if (_params.internalid) {
			filters.push(search.createFilter({
				name: 'internalid', operator: 'anyof', values: _params.internalid
			}));
		}
        else{
            return [];
        }

        return constSearch.getDataSource_Mixed(ID, filters, [], Records);
    };

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
