import 'weui';
import weui from 'weui.js';
import { Chart } from '@antv/g2';

// 获取设置
function getSetting(name, cb) {
  chrome.runtime.sendMessage({
    text: "getSetting",
    content: name
  }, function (response) {
    cb(response)
    console.log("getSetting Response: ", name, response);
  });
}

function renderDom() {
  let priceChartDOM = `
    <div class="jjbPriceChart">
      <h4 class="title">
        价格走势
        <select id="ChartDays" name="days">
          <option value="30">最近30天</option>
          <option value="60">最近60天</option>
          <option value="90">最近90天</option>
        </select>
        <div id="specialPromotion">
        </div>
        <span id="disablePriceChart">&times;</span>
      </h4>
      <div id="jjbPriceChart">
        <div class="ELazy-loading loading">加载中</div>
      </div>
      <span class="provider"><a href="https://blog.jjb.im/price-chart.html" target="_blank">由京价保提供</a></span>
    </div>
  `;
  if ($(".product-intro").length > 0) {
    $(".product-intro").append(priceChartDOM);
  }

  if ($(".first_area_md").length > 0) {
    $(".first_area_md").append(priceChartDOM);
  }

}
function timestampToDateNumber(timestamp) {
  return new Date(timestamp).toISOString().slice(0,10).replace(/-/g,"")
}

var slideIndex = 1;
function showPromotions(n) {
  var i;
  var x = document.getElementsByClassName("special-promotion-item");
  slideIndex = n
  if (n > x.length) {slideIndex = 1}
  if (n < 1) {slideIndex = x.length} ;
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  $(`#specialPromotion .controller .item__child`).removeClass('on')
  setTimeout(() => {
    $(`#specialPromotion .controller .item__child:eq(${slideIndex-1})`).addClass('on')
  }, 10);
  console.log('showPromotions', n, slideIndex, x[slideIndex-1])
  if (x[slideIndex-1]) {
    x[slideIndex-1].style.display = "block";
  }
}


function dealWithPriceDate(data) {
  if (data.chart.length > 2) {
    $("#jjbPriceChart").html('')
    console.log("dealWithPriceDate",$("#jjbPriceChart"))
    let specialPromotion = data.specialPromotion
    let chart = new Chart({
      container: 'jjbPriceChart',
      autoFit: true,
      renderer: 'svg',
      padding: [50, 50, 80, 50],
      height: 300
    });
    chart.data(data.chart)
    chart.scale('timestamp', {
      type: 'time',
      mask: 'MM-DD HH:mm',
      range: [0, 1],
      tickCount: 5
    });
    chart.scale('value', {
      min: data.averagePrice ? (data.averagePrice / 3) : 0,
      nice: true,
    });
    chart.line().position('timestamp*value').shape('hv').color('key').tooltip({ fields: [ 'key', 'value', 'timestamp' ], callback: (key, value, timestamp) => {
      const itemDate = timestampToDateNumber(timestamp)
      return {
        key,
        value: value,
        date: itemDate,
      };
    }});
    chart.tooltip(
      {
        showCrosshairs: true, // 展示 Tooltip 辅助线
        shared: true,
        showTitle: true,
        customContent: (title, items) => {
          let itemDom = ""
          let promotionsDom = ""
          let promotions = []

          items.forEach(item => {
            promotions = data.promotionLogs.find(function (promotion) {
              return promotion.date == item.date;
            });
            itemDom += `<li style="color:${item.color}"><span class="price-type">${item.key}</span>: ${item.value} 元</li>`
          });
          promotions && promotions.detail && promotions.detail.forEach(item => {
            promotionsDom += `<li><span class="tag">${item.typeName}</span><span class="description">${item.description}</span></li>`
          });
          return `
            <div class="g2-tooltip-title" style="margin-bottom: 4px;">${title}</div>
            <ul class="g2-tooltip-list">${itemDom}</ul>
            <ul class="promotions">${promotionsDom}</ul>
          `
        }
      }
    );

    let specialPromotionDom = ``
    specialPromotion && specialPromotion.forEach(item => {
      specialPromotionDom += `<div class="special-promotion-item"><a class="promotion-item" style="${item.style}" href="${item.url}" target="_break">${item.icon ? `<span class="icon"><img src="${item.icon}"/></span>` : ''}${item.title}</a></div>`
    });
    let specialPromotionControllerDom = ``
    specialPromotion &&specialPromotion.forEach((item, index) => {
      specialPromotionControllerDom += `<span class="item__child" data-index="${index}"></span>`
    });
    $("#specialPromotion").html(`
      <div class="promotions">${specialPromotionDom}</div>
      <div class="controller">${specialPromotionControllerDom}</div>
    `)
    chart.render();
    setTimeout(() => {
      showPromotions(Math.floor(Math.random()*specialPromotion.length) + 1);
      $( "#specialPromotion .controller .item__child" ).on( "click", function() {
        let index = $(this).data('index');
        console.log('index', index)
        showPromotions(index+1)
      });
    }, 50);

    setInterval(() => {
      showPromotions(Math.floor(Math.random()*specialPromotion.length) + 1);
    }, 30000);
  } else {
    $("#jjbPriceChart").html(`<div class="no_data">暂无数据</div>`)
  }
}


function getPriceChart(sku, days = 30) {
  console.log("getPriceChart", sku, days)
  chrome.runtime.sendMessage({
    action: "getPriceChart",
    sku: sku,
    days: days
  });
}

function showError(sku, error) {
  console.error(error);
  $("#jjbPriceChart").html(`<div id="retry" class="no_data">查询失败，点击重试</div>`);
  $('#retry').on('click', () => {
    getPriceChart(sku)
  })
}

// 应用消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('onMessage', message)
  switch (message.type) {
    case 'priceChart':
      if (message.error) {
        return showError(sku, error)
      }
      dealWithPriceDate(message.data)
      break;
    default:
      break;
  }
})

getSetting('disable_pricechart', function (disable) {
  if (disable == "checked") {
    console.log('价格走势图已禁用')
  } else {
    renderDom()
    setTimeout(function () {
      let urlInfo = /(https|http):\/\/item.jd.com\/([0-9]*).html/g.exec(window.location.href);
      if (window.location.host == 're.jd.com') {
        urlInfo = /(https|http):\/\/re.jd.com\/cps\/item\/([0-9]*).html/g.exec(window.location.href);
      }
      let sku = urlInfo[2]
      getPriceChart(sku)

      $('#ChartDays').on('change', function () {
        getPriceChart(sku, $(this).val());
      });
      $('#disablePriceChart').on('click', () => {
        weui.confirm('停用此功能后京价保将不再在商品页展示价格走势图，同时也将停止上报获取到的商品价格', function () {
          chrome.runtime.sendMessage({
            action: "setVariable",
            key: "disable_pricechart",
            value: "checked"
          },
          function (response) {
            weui.toast('停用成功', 1000);
            $(".jjbPriceChart").hide()
            console.log("disablePriceChart Response: ", response);
          });
          $('.jjbPriceChart').hide()
        }, function () {
          console.log('no')
        }, {
          title: '停用价格走势图'
        });
      })
    }, 1000)
  }
});


