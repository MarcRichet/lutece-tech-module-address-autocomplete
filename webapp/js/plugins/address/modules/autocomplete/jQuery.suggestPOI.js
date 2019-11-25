(function($) {

    // Ce script n'est utile qu'après initialisation de la configuration
    
    var $LUTECE = window.LUTECE || (window.LUTECE = {});
    var $MAA = $LUTECE.ADDRESS_AUTOCOMPLETE || ($LUTECE.ADDRESS_AUTOCOMPLETE = {});
    var $config = $MAA.config || ($MAA.config = {});
    
    var PROP_WS_URL = "suggestPOI.ws.url";
    var PROP_DATATYPE = "suggestPOI.ws.datatype";
    var PROP_ON_SELECT_UPDATE_DOM = "suggestPOI.param.onSelectUpdateDom";
    var PROP_API_INPUT = "suggestPOI.ws.apiinput";
    var PROP_UI_DELAY = "suggestPOI.ui.delay";
    var PROP_PARAM_QUERY_MIN_LENGTH = "suggestPOI.param.query.minLength";
    var PROP_PARAM_TYPES_DEFAULT = "suggestPOI.param.types.default";
    var PROP_PARAM_BANTYPE_DEFAULT = "suggestPOI.param.bantype.default";
    var PROP_PARAM_BANLAT_DEFAULT = "suggestPOI.param.banlat.default";
    var PROP_PARAM_BANLON_DEFAULT = "suggestPOI.param.banlon.default";
    var PROP_PARAM_BANPOSTCODE_DEFAULT = "suggestPOI.param.banpostcode.default";
    var PROP_PARAM_BANCITYCODE_DEFAULT = "suggestPOI.param.bancitycode.default";
    var PROP_PARAM_NB_RESULTS_DEFAULT = "suggestPOI.param.nbResults.default";
    var PROP_PARAM_CLIENT_ID = "suggestPOI.param.clientId";
    var PROP_PARAM_STOREADRFILTER_DEFAULT = "suggestPOI.param.storeadrfilter.default";
    var PROP_PARAM_STOREPOITYPES_DEFAULT =  "suggestPOI.param.types.default";
    var PROP_PARAM_PROJECTIONCODE_DEFAULT = "suggestPOI.param.projection";
    
    var EVT_NS_SPOI = ".suggestPOI";
    var EVT_SELECT = "select"
    var EVT_ERROR = "error";
    
    var DATATYPE_JSON = "json";
    var DATATYPE_JSONP = "jsonp";

    var APIINPUT_BAN = "BAN";
    var APIINPUT_SUGGESTPOI = "SUGGESTPOI";
    var APIINPUT_STOREADR = "STOREADR";
    var APIINPUT_STOREADR = "STOREPOI";

    var STOREADR_DEFAULT_FILTER = "France";
    
    var SEP_TYPES = ",";

    //Compatibility with older version where the APIINPUT and DATATYPE were not given.
    //Only SuggestPoi was available. An app could have overriden PROP_WS_URL, and now
    //we default PROP_DATATYPE and PROP_API_INPUT to the values for BAN. So attempt
    //to detect this situation and revert to the correct values for SuggestPOI
    if ($config[PROP_WS_URL].indexOf("SuggestPOI") > -1) {
        $config[PROP_DATATYPE] = DATATYPE_JSONP;
        $config[PROP_API_INPUT] = APIINPUT_SUGGESTPOI;
    }
    
    // Pattern de création d'un nouveau plugin jQuery.
    // Rajoute une méthode suggestPOI() à tout objet jQuery sélectionné dans le DOM.
    
    $.fn.extend({
        
        suggestPOI: function(options, arg) {
        
        	if (typeof(console) != "undefined") {
        		console.log(["SuggestPOI setup on:", this]);
        	}
        
            var defaultOptions = {
                types: $config[PROP_PARAM_TYPES_DEFAULT],
                bantype: $config[PROP_PARAM_BANTYPE_DEFAULT],
                banlat: $config[PROP_PARAM_BANLAT_DEFAULT],
                banlon: $config[PROP_PARAM_BANLON_DEFAULT],
                banpostcode: $config[PROP_PARAM_BANPOSTCODE_DEFAULT],
                bancitycode: $config[PROP_PARAM_BANCITYCODE_DEFAULT],
                storeadrfilter: $config[PROP_PARAM_STOREADRFILTER_DEFAULT],
                storepoitypes: $config[PROP_PARAM_STOREPOITYPES_DEFAULT],
                projectioncode: $config[PROP_PARAM_PROJECTIONCODE_DEFAULT],
                nbResults: $config[PROP_PARAM_NB_RESULTS_DEFAULT]
            };
            
            options = (
        		typeof(options) === "object" ?
				$.extend({}, defaultOptions, options) : defaultOptions
    		);
            
            $(this).each(function() {
                $.suggestPOI(this, options, arg);
            });
        }
    });
    
    /**
     * Met en place une auto-complétion de libellés de POI sur un champ texte.
     * 
     * Lève les événements d'identifiants suivants :
     * - $.suggestPOI.EVT_SELECT (sur le champ) lorsqu'un POI a été sélectionné dans la liste
     *   d'auto-complétion (event.poi est le POI sélectionné)
     * - $.suggestPOI.EVT_ERROR (sur le champ) en cas d'erreur (argument : l'erreur survenue)
     * 
     * @param elem      Un champ texte de formulaire (cible de l'appel jQuery)
     * @param options   (opt.) Un objet d'options de configuration, dont notamment :
     *   - nbResults : nombre de résultats désirés (valeur par défaut en configuration)
     *   - types : tableau ou liste (concaténée par ",") d'identifiants de types de POI (valeur par défaut en configuration)
     * @param arg       (opt.) Autre argument statique. 
     */
    $.suggestPOI = function(elem, options, arg) {
    
        var jElem = $(elem);
              
        var nbResults = options.nbResults;
        var types = options.types;
        var bantype = options.bantype;
        var banlat = options.banlat;
        var banlon = options.banlon;
        var banpostcode = options.banpostcode;
        var bancitycode = options.bancitycode;
        var storepoitypes = options.storepoitypes;
        var projectioncode = options.projectioncode;
        var storeadrfilter = options.storeadrfilter || STOREADR_DEFAULT_FILTER;
        
        if ($.isArray(types)) {
            types = types.join(SEP_TYPES);
        }
            
	    jElem.autocomplete({
	    
            minLength: $config[PROP_PARAM_QUERY_MIN_LENGTH],
            delay: $config[PROP_UI_DELAY],
	       
            // Définition de la source de données.
            // Une méthode convient pour une source distante.
	        source: function(input, forward) {
	        	
	        	var jThis = $(this);

                var ajax_data;
                var ajax_url;
                if ($config[PROP_API_INPUT] == APIINPUT_BAN) {
                    ajax_url = $config[PROP_WS_URL]
	                ajax_data = {
	                    q: input.term,
	                    limit: nbResults,
	                    lat: banlat,
	                    lon: banlon,
	                    postcode: banpostcode,
	                    citycode: bancitycode,
	                    type: bantype
	                };
                } else if ($config[PROP_API_INPUT] == APIINPUT_STOREADR) {
                    ajax_url = $config[PROP_WS_URL] + "/" + $config[PROP_PARAM_CLIENT_ID] + "/" + storeadrfilter + "/adrauto/" + input.term;
                    ajax_data = null;
                } else if ($config[PROP_API_INPUT] == APIINPUT_STOREPOI) {
                    ajax_url = $config[PROP_WS_URL] + "/" + $config[PROP_PARAM_CLIENT_ID] + "/poiauto/" + input.term + "?Parms={\"Entites\" : \"" + storepoitypes + "\", \"toSrid\" :\""+projectioncode+"\"}";
                    ajax_data = null;
                } else {
                    ajax_url = $config[PROP_WS_URL]
	                ajax_data = {
	                    clientId: $config[PROP_PARAM_CLIENT_ID],
	                    query: input.term,
	                    nbResults: nbResults,
	                    types: types
	                };
                }
	      
	            $.ajax({
	              
	                url: ajax_url,
	                dataType: $config[PROP_DATATYPE] || DATATYPE_JSONP,
	                data: ajax_data,
	                
	                success: function(data) {
	                
	                    if (typeof(data.error) !== "undefined") {
	                    	
	                    	if (typeof(console) !== "undefined") {
				            	console.error(data.error);
				            }
	            
	                    	jThis.trigger($.Event(EVT_ERROR), data.error);
	                    }
	                    else {
	                    
                            // Il faut produire des objets qui comportent a minima
                            // une propriété "label" pour affichage dans la liste déroulante
                            // de suggestions.
	                    
                            var listResults;
                            if ($config[PROP_API_INPUT] == APIINPUT_BAN) {
                                listResults = data.features;
                            } else if ($config[PROP_API_INPUT] == APIINPUT_STOREADR) {
                                listResults = data.result;
                            } else {
                                listResults = data.result;
                            }
	                        forward($.map(listResults, function(item) {
	                           
                                var item2;
                                if ($config[PROP_API_INPUT] == APIINPUT_BAN) {
                                    item2 = {
                                        "libelleTypo":item.properties.label,
                                        "id":item.properties.id,
                                        "x":item.geometry.coordinates[0],
                                        "y":item.geometry.coordinates[1],
                                        "sourcePOI": item,
                                        "type":item.properties.type
                                    };
                                } else if ($config[PROP_API_INPUT] == APIINPUT_STOREADR) {
                                    item2 = {
                                        "libelleTypo":item.Adressetypo,
                                        "id":item.Idadrposte
                                    };
                                } else {
                                    item2 = item;
                                }

	                
	                           return {	                           
	                               label: item2.libelleTypo,
	                               poi: item2
	                           };
	                        }));
	                    }
	                },
	            
	                error: function (xhr, ajaxOptions, thrownError) {
	                    
	                    if (typeof(console) !== "undefined") {
	                        console.error([thrownError, xhr, ajaxOptions]);
	                    }
	                    
	                    jThis.trigger($.Event(EVT_ERROR, thrownError));
	                }
	            });
	        },
	    
            // Un élément a été sélectionné
	        select: function(event, ui) {
	        
	            if (typeof(ui.item) !== "undefined") {
                    if ($config[PROP_API_INPUT] == APIINPUT_STOREADR) {
                      var _this = this;
                      var ajax_url = $config[PROP_WS_URL] + "/" + $config[PROP_PARAM_CLIENT_ID] + "/idadrposte/" + ui.item.poi.id;
                      $.get( ajax_url, undefined, function(data) {
                          var item = {
                                      label: ui.item.label,
                                      value: ui.item.value,
                                      poi: data.result
                          };
                          $(_this).trigger($.Event(EVT_SELECT, item));
                      }, $config[PROP_DATATYPE] || DATATYPE_JSONP);
                    } else {
                        $(this).trigger($.Event(EVT_SELECT, ui.item));
                    }
	            }
	            if ($config[PROP_ON_SELECT_UPDATE_DOM] === "false") {
	               //Both lines should be enough on their own to prevent jquery-ui
	               //from updating the <input>, but keep them both just in case
	               event.preventDefault();
	               return false;
	           }
	        },
	    
	        open: function() {
	            $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
	        },
	    
	        close: function() {
	            $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
	        }
	    });
    };
    
    $.suggestPOI.EVT_SELECT = EVT_SELECT + EVT_NS_SPOI; // Choix de POI effectué
    $.suggestPOI.EVT_ERROR = EVT_ERROR + EVT_NS_SPOI; // Erreur survenue

})(jQuery);