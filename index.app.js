!function(n){function t(r){if(e[r])return e[r].exports;var o=e[r]={exports:{},id:r,loaded:!1};return n[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}var e={};return t.m=n,t.c=e,t.p="",t(0)}([function(n,t){"use strict";function e(){var n=a("#form");s.addEventListener("input",o),l.addEventListener("input",o),n.addEventListener("submit",r),o()}function r(n){function t(){i.disabled=!1,i.innerHTML=u}n.preventDefault();var e=d.defaultAccount,r=l.value,o=d.toWei(s.value),i=a("#form button"),u=i.innerHTML;i.disabled=!0,i.innerHTML="Sending...";try{d.eth.sendTransaction({from:e,to:r,value:o},function(n,e){t(),n||window.alert("Transaction has been sent. Hash: "+e)})}catch(c){t(),window.alert(c)}}function o(){var n=a("#summary"),t=a("#form button"),e=d.defaultAccount,r=l.value,o=s.value;return o&&r&&e?(t.disabled=!1,void(n.innerHTML="\n  You will transfer <strong>"+s.value+" ETH</strong>\n  from <strong>"+d.defaultAccount+"</strong>\n  to <strong>"+l.value+"</strong>.\n  ")):(t.disabled=!0,void(n.innerHTML="Fill out all fields."))}function i(n){a("#accounts").innerHTML=n}function u(n){var t=d.fromWei(n).toFixed(2);a("#balance").innerHTML=t,s.max=t}function a(n){return document.querySelector(n)}function c(n){return function(t,e){if(t)throw new Error(t);n(e)}}var d=window.web3;if(!d)throw new Error("Web3 instance is expected to be provided from outside.");setInterval(function(){d.eth.getAccounts(c(function(n){d.defaultAccount=n[0],i(n),d.eth.getBalance(n[0],c(function(n){u(n)}))}))},2e3);var s=a("#value"),l=a("#address");e()}]);
//# sourceMappingURL=index.app.js.map