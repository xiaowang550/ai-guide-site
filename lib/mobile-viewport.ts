/** Runs before hydration. Native viewport observation needs no React bundle. */
export const MOBILE_VIEWPORT_BOOTSTRAP = `(function(){
  var root=document.documentElement,frame=0,baseline=innerHeight;
  function update(){
    if(innerWidth>=1024){root.dataset.keyboard='closed';return}
    var v=window.visualViewport,h=v?v.height:innerHeight;
    var el=document.activeElement,editable=el&&el.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable="true"]');
    if(!editable)baseline=innerHeight;
    var keyboard=!!editable&&(!v||v.scale<1.1)&&baseline-h>140;
    root.style.setProperty('--visible-height',h+'px');
    root.style.setProperty('--visible-top',(v?v.offsetTop:0)+'px');
    root.dataset.keyboard=keyboard?'open':'closed';
    dispatchEvent(new Event('zhiya:layout'));
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
  addEventListener('resize',schedule);
  addEventListener('orientationchange',function(){baseline=innerHeight;schedule()});
  if(window.visualViewport){visualViewport.addEventListener('resize',schedule);visualViewport.addEventListener('scroll',schedule)}
  document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  addEventListener('beforeinstallprompt',function(event){if(innerWidth<1024){event.preventDefault();window.zhiyaInstallPrompt=event}});
  update();
})()`.replace(/\n\s*/g, '')
