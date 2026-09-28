/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Sep 2026         Thanh Hoan			    Init, create file
 */
define([],
    () => {
        const Records = {
            Architects: {
                ID: 8,
                NAME: "Architects"
            },
            ME: {
                ID: 6,
                NAME: "M&E"
            },
            Landscape: {
                ID: 7,
                NAME: "Landscape"
            },
            Structure: {
                ID: 9,
                NAME: "Structure"
            },
            ID: {
                ID: 10,
                NAME: "ID"
            },
        }

        return {
            TYPE: "customlist_scv_p_consultant_type",
            Records,
        };
        
    });
