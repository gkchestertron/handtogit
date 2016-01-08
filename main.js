window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    window.htg = new HTG($('#editor'));
},false);
