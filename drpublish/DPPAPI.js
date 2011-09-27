// To avoid telling the Dev multiple times that a plugin is not new
var _saidNotNew = [];

/**
 * Methods for interacting with DrPublish Plugins
 */
var DPPAPI = {
  
  /**
   * Sends a message to the given plugin's iframe
   * 
   * @param plugin Name of plugin to send message to
   * @param callSpec Type of message to send
   * @param data Data contained in message
   * @param callback Function to call on success
   * @param errorCallback Function to call on failure (i.e. plugin not loaded)
   */
  send : function ( plugin, callSpec, data, callback, errorCallback ) {
    
    if ( callSpec == "event" ) {
      //console.log ( 'DPPAPI: Notifying ' + plugin + ' of ' + data.type + ' event ', data.data );
    } else {
      console.info ( 'DPPAPI: Sending ' + callSpec + ' signal to plugin ' + plugin );
    }
    
    if ( !document.getElementById ( 'plugin-' + plugin ) ) {
      console.warn ( 'DPPAPI: Plugin ' + plugin + ' does not have a frame, and thus cannot be contacted' );
      if ( typeof errorCallback == "function" ) {
        errorCallback ( 'plugin not loaded' );
      }
      return
    }
      
    if ( !Plugins.get ( plugin ).isReady ) {
      if ( _saidNotNew.indexOf ( plugin ) < 0 ) {
        console.warn ( 'DPPAPI: Could not notify ' + plugin + ': Plugin not authenticated' );
        _saidNotNew.push ( plugin );
      }
      if ( typeof errorCallback == "function" ) {
        errorCallback ( 'plugin not loaded' );
      }
      return;
    }
    
    pm ( {
      target : window.frames['plugin-' + plugin],
      type : callSpec,
      data : data,
      success : callback,
      error : errorCallback,
      origin : "*", // TODO: Find a way of avoiding all-origins
      hash : false
    } );
  },
  
  /**
   * Send an event to a single plugin
   * 
   * @param plugin Name of plugin to send event to
   * @param event Type of event
   * @param data Event data
   */
  directedEvent : function ( plugin, event, data, callback, errorCallback ) {
    var plugin = Plugins.get ( plugin );
    
    if ( !plugin || !plugin.isLoaded ) {
      errorCallback ( data );
    } else {
      this.send ( plugin, 'event', {
        type : event,
        data : data
      }, callback, errorCallback );
    }
  },
  
  /**
   * Send an event to all loaded plugins
   * 
   * Plugin events will be sent to one plugin at the time sequentially, and will pass data from each one into the next
   * 
   * @param event Type of event
   * @param data Event data
   */
  event : function ( event, data, callback ) {
    
    var done = [];
    var notify = Plugins.list;
    var _this = this;
    
    if ( !notify.length ) {
      console.log ( "DPPAPI: No plugins loaded, and thus event " + event + " is ignored" );
      
      if ( typeof callback == "function" ) {
        callback ( data );
      }
      return;
    }
    
    function _doMore ( data ) {
      var complete = function ( data ) {
        
        done.push ( true );
        
        if ( done.length == notify.length ) {
          if ( event != 'modifiedContent' ) {
            // Because it's sent ALL THE TIME
            console.log ( 'DPPAPI: All plugins notified of ' + event + ' (' + notify.length + ')' );
          }
          if ( typeof callback == "function" ) {
            callback ( data );
          }
        } else {
          _doMore ( data );
        }
      };
      
      _this.directedEvent ( notify[done.length].name, event, data, complete, function ( d ) { complete ( data ); } );
    }
    
    _doMore ( data );
  },
  
  bind_c : function ( event, callback ) {
    pm.bind ( event, function ( data, replyCallback, e ) {
      if ( DPPAPI._verify ( data.src_plugin, e ) ) {
        callback ( data, replyCallback );
      }
    } );
  },
  
  bind : function ( event, callback ) {
    pm.bind ( event, function ( data, replyCallback, e ) {
      if ( DPPAPI._verify ( data.src_plugin, e ) ) {
        return callback ( data );
      }
    } );
  },
  
  _verify : function ( plugin, frame ) {
    if ( frame.id == 'plugin-' + plugin ) {
      var plugin = Plugins.get ( plugin );
      if ( plugin && plugin.isReady ) {
        return true;
      }
    }
    
    console.warn ( "DPPAPI: Unauthenticated plugin " + plugin + " attempted to use API" );
    return false;
  }
};