'use strict';

/* Services */

// FIXME: clean this dirty hack
var stickyModeHeight = 80;

angular.module('app.directives', [])
  
  .directive('hexUs', function ($timeout, usStatesHex, colors) {
    return {
      restrict: 'A',
      scope: {
          data: '=',
          statuses: '=',
          setRegion: '=',
          region: '=',
          month: '='
      },
      link: function($scope, el, attrs) {

        el.html('<div>Loading...</div>')
        
        $scope.$watch('statuses', redraw, true)
        $scope.$watch('region', redraw)
        $scope.$watch('month', redraw)
        window.addEventListener('resize', redraw)
        $scope.$on('$destroy', function(){
          window.removeEventListener('resize', redraw)
        })

        function redraw() {
          if (el[0].offsetWidth > 0 && $scope.statuses !== undefined){
            $timeout(function () {
              el.html('');
      
              var regions = usStatesHex.data;

              // Setup: dimensions
              var margin = {top: 24, right: 0, bottom: 24, left: 0};
              var width = el[0].offsetWidth - margin.left - margin.right - 12;
              var height = el[0].offsetHeight - margin.top - margin.bottom;

              // Setup: scales
              var size = d3.scale.linear()
                  .range([0, height]);
              
              var dotSize = d3.scale.linear()
                  .range([0, 0.5 * (regions[0].xExtent[1] - regions[0].xExtent[0])])

              // Setup: SVG container
              var svg = d3.select(el[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

              // Binding: scales
              size.domain(d3.extent(
                regions.map(function(d) { return d.yExtent[0]; })
                .concat(regions.map(function(d) { return d.yExtent[1]; }))
              ));

              dotSize.domain(d3.extent(
                regions.map(function(d) { return d3.extent($scope.data[d.abbr] || [])[0] })
                .concat(regions.map(function(d) { return d3.extent($scope.data[d.abbr] || [])[1] }))
              ))

              var xExtent = d3.extent(
                regions.map(function(d) { return d.xExtent[0]; })
                .concat(regions.map(function(d) { return d.xExtent[1]; }))
              )
              var xOffset = -size(xExtent[0]) + (width / 2 - ( size(xExtent[1]) - size(xExtent[0]) ) / 2 )
              
              var lineFunction = d3.svg.line()
                .x(function(d) { return xOffset + size(d[0]); })
                .y(function(d) { return size(d[1]); })
                .interpolate('linear');

              var regionGroups = svg.selectAll('.hex')
                .data(regions)
              .enter().append('g')
                .attr('class', 'hex')
                .style('cursor', function(d){
                  if (regionValid(d.abbr)) {
                    return 'pointer'
                  }
                  return 'default'
                })
                .on('mouseover', function(d) {
                  if (regionValid(d.abbr)) {
                    d3.select(this).select('path.hexagon')
                      .attr('fill', colors.mapItemHighlight)
                    d3.select(this).select('text.border')
                      .attr('stroke', colors.mapItemHighlight)
                      .attr('fill', colors.mapItemHighlight)
                  }
                })                  
                .on('mouseout', function(d) {
                  if (regionValid(d.abbr)) {
                    d3.select(this).select('path')
                      .attr('fill', regionColor)
                    d3.select(this).select('text.border')
                      .attr('stroke', regionColor)
                      .attr('fill', regionColor)
                  }
                })
                .on('click', function(d) {
                  d3.event.stopPropagation();
                  if (regionValid(d.abbr)) {
                    $scope.setRegion(d.abbr)
                  }
                })

              // Hexagons
              regionGroups.append('path')
                .attr('class', 'hexagon')
                .attr('d', function (d) { return lineFunction(d.hex); })
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', regionColor)

              // Dots
              regionGroups.append('circle')
                .attr('class', 'data-circle')
                .attr('r', function (d) {
                  if (regionValid(d.abbr)) {
                    return size(dotSize($scope.data[d.abbr][$scope.month]))
                  } else {
                    return 0
                  }
                })
                .attr('cx', function(d) {return xOffset + size(d.x)})
                .attr('cy', function(d) {return size(d.y)})
                .attr('stroke', 'none')
                .attr('fill', dotColor)
                .attr('opacity', .8)

              // Sparklines
              /*regionGroups.append('path')
                .attr('class', 'sparkline')
                .attr('d', function (d) {
                  if (regionValid(d.abbr)) {
                    var sparklineFunction = buildSparklineFunction(d)
                    return sparklineFunction($scope.data[d.abbr])
                  }
                })
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', 'none')
                .attr('opacity', .8)*/

              // Border text
              var yTextOffset = 6;
              regionGroups.append('text')
                .text(function (d) { return d.abbr })
                .attr('x', function(d){ return xOffset + size(d.x) })
                .attr('y', function(d){ return yTextOffset + size(d.y) })
                .attr('font-family', 'Roboto')
                .attr('font-weight', '300')
                .attr('font-size', '18px')
                .attr('fill', 'white')
                .attr('text-anchor', 'middle')
                .attr('opacity', 1)

              /*function buildSparklineFunction(region) {
                // scales
                var x = d3.scale.linear()
                  .range([region.hex[4][0] + 1, region.hex[1][0] - 1])
                  .domain([0, $scope.data[region.abbr].length])
                var y = d3.scale.linear()
                  .range([region.hex[4][1], region.hex[1][1]])
                  .domain([-2, 2])
                  // .domain(d3.extent($scope.data[region.abbr]))
                return d3.svg.line()
                  .x(function(d, i) { return xOffset + size(x(i)); })
                  .y(function(d) { return size(y(d)); })
                  .interpolate('bundle');
              }*/

              function regionValid(d) {
                return $scope.statuses[d] && $scope.statuses[d].available
              }

              function regionOpacity(d) {
                return 1
              }

              function regionColor(d) {
                if ($scope.region == d.abbr) {
                  return colors.mapItemHighlight
                } else if ($scope.statuses[d.abbr]) {
                  if ($scope.statuses[d.abbr].loading) {
                    return colors.mapItemLoading
                  } else if ($scope.statuses[d.abbr].available) {
                    return colors.mapItemReady
                  } else {
                    return colors.mapItemUnavailable
                  }
                } else {
                  return colors.mapItemLoading
                }
              }

              function dotColor(d) {
                if ($scope.region == d.abbr) {
                  return colors.mapDotHighlight
                } else {
                  return colors.mapDot
                }
              }
            }, 0, false);
          }
        }
      }
    }
  })

  .directive('stackedCurvesUs', function ($timeout, usStatesHex, colors) {
    return {
      restrict: 'A',
      scope: {
          data: '=',
          statuses: '=',
          region: '=',
          month: '=',
          summary: '='
      },
      link: function($scope, el, attrs) {

        el.html('<div>Loading...</div>')
        
        $scope.$watch('statuses', redraw, true)
        $scope.$watch('region', redraw)
        $scope.$watch('month', redraw)
        window.addEventListener('resize', redraw)
        $scope.$on('$destroy', function(){
          window.removeEventListener('resize', redraw)
        })

        function redraw() {
          if (el[0].offsetWidth > 0 && $scope.statuses !== undefined){
            $timeout(function () {
              el.html('');
      
              var regions = usStatesHex.data;

              // Preliminary data crunching
              var allValues = []
              var seriesLength = 0
              var region
              for (region in $scope.data) {
                var series = $scope.data[region]
                if ( series && series.length > 0 ) {
                  seriesLength = Math.max(seriesLength, series.length)
                  allValues = allValues.concat(series)
                }
              }

              // Semiotic settings
              var settings = {
                color: {
                }
              }

              // Setup: dimensions
              var margin = {top: 6, right: 12, bottom: 24, left: 300};
              var width = el[0].offsetWidth - margin.left - margin.right - 12;
              var height = el[0].offsetHeight - margin.top - margin.bottom;

              // Setup: scales
              var x = d3.scale.linear()
                .domain([0, seriesLength - 1])
                .range([0, width])
              
              var y = d3.scale.linear()
                .domain([-5, 5])
                // .domain(d3.extent(allValues))
                .range([height, 0])

              var yAxis = d3.svg.axis()
              .scale(y)
              .orient("left");

              // Setup: SVG container
              var svg = d3.select(el[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
              
              var lineFunction = d3.svg.line()
                .x(function(d, i) { return x(i); })
                .y(function(d) { return y(d); })
                .interpolate('cardinal');

              var curves = svg.selectAll('.curve')
                .data(regions)
              .enter().append('g')
                .attr('class', 'curve')
              .append("path")
                .attr('d', function (d) {
                  if (regionValid(d.abbr)) return lineFunction($scope.data[d.abbr])
                })
                .attr('stroke', colors.curve)
                .attr('stroke-width', .8)
                .attr('fill', 'none')
                .attr('opacity', .6)
              
              // Additional informations
              var overlay = svg.append('g')

              // Line of the selected date
              overlay.append("line")
                .attr("x1", x($scope.month))
                .attr("y1", 0)
                .attr("x2", x($scope.month))
                .attr("y2", height)
                .style("stroke-width", 2)
                .style("stroke", colors.time)
                .style("fill", "none");

              // Dot for min region
              if ($scope.summary.minRegion && $scope.data[$scope.summary.minRegion]) {
                overlay.append("circle")
                  .attr("cx", x($scope.month))
                  .attr("cy", y($scope.data[$scope.summary.minRegion][$scope.month]))
                  .attr("r", 4)
                  .style("fill", colors.curve);
              }

              // Dot for max region
              if ($scope.summary.maxRegion && $scope.data[$scope.summary.maxRegion]) {
                overlay.append("circle")
                  .attr("cx", x($scope.month))
                  .attr("cy", y($scope.data[$scope.summary.maxRegion][$scope.month]))
                  .attr("r", 4)
                  .style("fill", colors.curve);
              }

              // Curve of current region
              if ($scope.region && regionValid($scope.region)) {
                overlay.append("path")
                  .attr('d', lineFunction($scope.data[$scope.region]))
                  .attr('stroke', colors.regionHighlight)
                  .attr('stroke-width', 2)
                  .attr('fill', 'none')
                  .attr('opacity', 1)
              }

              // Dot for current region
              if ($scope.region && $scope.data[$scope.region]) {
                overlay.append("circle")
                  .attr("cx", x($scope.month))
                  .attr("cy", y($scope.data[$scope.region][$scope.month]))
                  .attr("r", 4)
                  .style("fill", colors.regionHighlight);
              }

            }, 0)
          }
        }

        function regionValid(d) {
          return $scope.statuses[d] && $scope.statuses[d].available
        }
      }
    }
  })
  
  .directive('simpleCurve', function ($timeout, colors) {
    return {
      restrict: 'A',
      scope: {
        data: '=',
        month: '=',
        status: '=',
        highlight: '='
      },
      link: function($scope, el, attrs) {

        el.html('<div><center>Loading...</center></div>')
        
        $scope.$watch('status', redraw, true)
        $scope.$watch('month', redraw)
        $scope.$watch('highlight', redraw)
        window.addEventListener('resize', redraw)
        $scope.$on('$destroy', function(){
          window.removeEventListener('resize', redraw)
        })

        function redraw() {
          if ($scope.data !== undefined){
            $timeout(function () {
              el.html('');
              
              // Setup: dimensions
              var margin = {top: 0, right: 12, bottom: 0, left: 300};
              var width = el[0].offsetWidth - margin.left - margin.right - 12;
              var height = el[0].offsetHeight - margin.top - margin.bottom;

              // Setup: scales
              var x = d3.scale.linear()
                .domain([0, $scope.data.length - 1])
                .range([0, width])
              
              var y = d3.scale.linear()
                .domain([-5, 5])
                .range([height, 0])

              var yAxis = d3.svg.axis()
              .scale(y)
              .orient("left");

              // Setup: SVG container
              var svg = d3.select(el[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
              
              var lineFunction = d3.svg.line()
                .x(function(d, i) { return x(i); })
                .y(function(d) { return y(d); })
                .interpolate('cardinal');

              var curveColor = $scope.highlight ? colors.regionHighlight : colors.topicCurve

              if ($scope.data) {
                svg
                  .append("path")
                    .attr('d', lineFunction($scope.data) )
                    .attr('stroke', curveColor)
                    .attr('stroke-width', 1)
                    .attr('fill', 'none')
              }
              
              // Additional informations
              var overlay = svg.append('g')

              // Line of the selected date
              overlay.append("line")
                .attr("x1", x($scope.month))
                .attr("y1", 0)
                .attr("x2", x($scope.month))
                .attr("y2", height)
                .style("stroke-width", 2)
                .style("stroke", colors.time)
                .style("fill", "none");

              // Dot
              overlay.append("circle")
                .attr("cx", x($scope.month))
                .attr("cy", y($scope.data[$scope.month]))
                .attr("r", 4)
                .style("fill", curveColor);

            }, 0)
          }
        }

        function regionValid(d) {
          return $scope.statuses[d] && $scope.statuses[d].available
        }
      }
    }
  })

  .directive('timeSlider', function ($timeout, $interval, colors, seriesMetadata) {
    return {
      restrict: 'A',
      scope: {
        month: '=',
        monthNames: '='
      },
      templateUrl: 'src/directives/timeSlider.html',
      link: function(scope, el, attrs) {
        var timeTick
        var timeIntervalMilliseconds = 180
        scope.colors = colors
        scope.sticking = false
        scope.startDate = new Date(seriesMetadata.us.startDate)
        scope.endDate = new Date(seriesMetadata.us.endDate)
        scope.monthMax = monthDiff(scope.startDate, scope.endDate) + 1
        scope.monthDate = ''
        scope.date = getDate()
        scope.timePlaying = false

        scope.$watch('month', getDate)
        scope.$watch('monthNames', getDate)

        scope.playPauseTime = function () {
          if (scope.timePlaying) {
            // Stop
            stopTimeTick()
          } else {
            // Play
            scope.timePlaying = true
            timeTick = $interval(function() {
              nextTimeTick()
            }, timeIntervalMilliseconds)
          }
        }

        scope.$on('$destroy', function() {
          // Make sure that the interval is destroyed
          stopTimeTick()
        });

        function getDate() {
          scope.date = addMonths(scope.startDate, scope.month)
          var d = new Date(scope.date)
          var monthName = scope.monthNames[d.getMonth()] || ''
          scope.monthDate = monthName + ' ' + d.getFullYear()
        }

        function nextTimeTick() {
          scope.month += 1
          if (scope.month > scope.monthMax) {
            scope.month = 0
            stopTimeTick()
          }
        }

        function stopTimeTick() {
          scope.timePlaying = false
          if (angular.isDefined(timeTick)) {
            $interval.cancel(timeTick);
            timeTick = undefined;
          }
        }

        function addMonths(d, m) {
          return new Date(d.getTime()).setMonth(d.getMonth() + m)
        }

        function monthDiff(d1, d2) {
          var months;
          months = (d2.getFullYear() - d1.getFullYear()) * 12;
          months -= d1.getMonth() + 1;
          months += d2.getMonth();
          return months <= 0 ? 0 : months;
        }

        // Custom sticky behavior
        var namespace = 'sticky'
        // get element
        var element = el[0]
        // get document
        var document = element.ownerDocument
        // get window
        var window = document.defaultView
        // get wrapper
        var wrapper = document.createElement('span')
        // cache style
        var style = element.getAttribute('style')
        // get options
        var bottom = parseFloat(attrs[namespace + 'Bottom'])
        var media = window.matchMedia(attrs[namespace + 'Media'] || 'all')
        var top = document.querySelector('md-toolbar').offsetHeight + stickyModeHeight

        // initialize regions
        var activeBottom = false
        var activeTop = false
        var offset = {}

        // configure wrapper
        wrapper.className = 'is-' + namespace;

        // activate sticky
        function activate() {
          // get element computed style
          var computedStyle = getComputedStyle(element)
          var position = activeTop ? 'top:' + top : 'bottom:' + bottom
          var parentNode = element.parentNode
          var nextSibling = element.nextSibling

          // replace element with wrapper containing element
          wrapper.appendChild(element)

          if (parentNode) {
            parentNode.insertBefore(wrapper, nextSibling)
          }

          // style wrapper
          wrapper.setAttribute('style', 'display:' + computedStyle.display + ';height:' + element.offsetHeight + 'px;margin:' + computedStyle.margin + ';width:' + element.offsetWidth + 'px');

          // style element
          element.setAttribute('style', 'left:' + offset.left + 'px;margin:0;position:fixed;transition:none;' + position + 'px;width:' + computedStyle.width);

          // angular state
          $timeout(function () {
            scope.sticking = true
            scope.$apply()
          }, 0)
        }

        // deactivate sticky
        function deactivate() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            var parentNode = wrapper.parentNode
            var nextSibling = wrapper.nextSibling

            // replace wrapper with element
            parentNode.removeChild(wrapper);

            parentNode.insertBefore(element, nextSibling);

            // unstyle element
            if (style === null) {
              element.removeAttribute('style');
            } else {
              element.setAttribute('style', style);
            }

            // unstyle wrapper
            wrapper.removeAttribute('style');

            activeTop = activeBottom = false;

            // angular state
            $timeout(function () {
              scope.sticking = false
              scope.$apply()
            }, 0)
          }
        }

        // window scroll listener
        function onscroll() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            // if activated
            if (activeTop || activeBottom) {
              // get wrapper offset
              offset = wrapper.getBoundingClientRect();

              activeBottom = !isNaN(bottom) && offset.top > window.innerHeight - bottom - wrapper.offsetHeight;
              activeTop = !isNaN(top) && offset.top < top;

              // deactivate if wrapper is inside range
              if (!activeTop && !activeBottom) {
                deactivate();
              }
            }
            // if not activated
            else if (media.matches) {
              // get element offset
              offset = element.getBoundingClientRect();

              activeBottom = !isNaN(bottom) && offset.top > window.innerHeight - bottom - element.offsetHeight;
              activeTop = !isNaN(top) && offset.top < top;

              // activate if element is outside range
              if (activeTop || activeBottom) {
                activate();
              }
            }
          }
        }

        // window resize listener
        function onresize() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            // conditionally deactivate sticky
            if (activeTop || activeBottom) {
              deactivate();
            }

            // re-initialize sticky
            onscroll();
          }
        }

        // destroy listener
        function ondestroy() {
          onresize();

          document.querySelector('md-content').removeEventListener('scroll', onscroll);
          window.removeEventListener('resize', onresize);
        }

        // bind listeners TO MD CONTENT
        document.querySelector('md-content').addEventListener('scroll', onscroll);
        window.addEventListener('resize', onresize);

        scope.$on('$destroy', ondestroy);

        // initialize sticky
        onscroll();
      }
    }
  })

  .directive('topicSelector', function ($timeout, colors, regionsMetadata) {
    return {
      restrict: 'A',
      scope: {
        topics: '=',
        topic: '=',
        regions: '=',
        region: '=',
        seriesMeasure: '=',
        seriesDomain: '='
      },
      templateUrl: 'src/directives/topicSelector.html',
      link: function(scope, el, attrs) {
        scope.stickyModeHeight = stickyModeHeight
        scope.sticking = false
        scope.topModifier = 1000
        scope.setTopic = function (topic) {
          scope.topic = topic
        }

        scope.regionName = function (r) {
          if (r === 'US') {
            return 'the United States'
          } else {
            return regionsMetadata.USA.values[r]
          }
        }

        // Update topModifier
        scope.$watch('seriesMeasure', updateTopModifier)
        scope.$watch('seriesDomain', updateTopModifier)

        function updateTopModifier() {
          $timeout(function() {
            scope.topModifier = el[0].offsetHeight - scope.stickyModeHeight
          }, 0)
        }

        // Custom sticky behavior
        var namespace = 'sticky-topics'
        // get element
        var element = el[0]
        // get document
        var document = element.ownerDocument
        // get window
        var window = document.defaultView
        // get wrapper
        var wrapper = document.createElement('span')
        // cache style
        var style = element.getAttribute('style')
        // get options
        var bottom = parseFloat(attrs[namespace + 'Bottom'])
        var media = window.matchMedia(attrs[namespace + 'Media'] || 'all')
        var top = document.querySelector('md-toolbar').offsetHeight

        // initialize regions
        var activeBottom = false
        var activeTop = false
        var offset = {}

        // configure wrapper
        wrapper.className = 'is-' + namespace;

        // activate sticky
        function activate() {
          // get element computed style
          var computedStyle = getComputedStyle(element)
          var position = activeTop ? 'top:' + top : 'bottom:' + bottom
          var parentNode = element.parentNode
          var nextSibling = element.nextSibling

          // replace element with wrapper containing element
          wrapper.appendChild(element)

          if (parentNode) {
            parentNode.insertBefore(wrapper, nextSibling)
          }

          // style wrapper
          wrapper.setAttribute('style', 'display:' + computedStyle.display + ';height:' + element.offsetHeight + 'px;margin:' + computedStyle.margin + ';width:' + element.offsetWidth + 'px');

          // style element
          element.setAttribute('style', 'left:' + offset.left + 'px;margin:0;position:fixed;transition:none;' + position + 'px;width:' + computedStyle.width);

          // Hide / show elements
          element.querySelector('.display-when-sticky').style.display = ''
          element.querySelector('.display-before-sticky').style.display = 'none'

          // angular state
          $timeout(function () {
            scope.sticking = true
            scope.$apply()
          }, 0)
        }

        // deactivate sticky
        function deactivate() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            var parentNode = wrapper.parentNode
            var nextSibling = wrapper.nextSibling

            // replace wrapper with element
            parentNode.removeChild(wrapper);

            parentNode.insertBefore(element, nextSibling);

            // unstyle element
            if (style === null) {
              element.removeAttribute('style');
            } else {
              element.setAttribute('style', style);
            }

            // unstyle wrapper
            wrapper.removeAttribute('style');

            activeTop = activeBottom = false;

            // Hide / show elements
            element.querySelector('.display-when-sticky').style.display = 'none'
            element.querySelector('.display-before-sticky').style.display = ''

            // angular state
            $timeout(function () {
              scope.sticking = false
              scope.$apply()
            }, 0)
          }
        }

        // window scroll listener
        function onscroll() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            // if activated
            if (activeTop || activeBottom) {
              // get wrapper offset
              offset = wrapper.getBoundingClientRect();

              // Modify offset
              offset = {top: offset.top + scope.topModifier}

              activeBottom = !isNaN(bottom) && offset.top > window.innerHeight - bottom - wrapper.offsetHeight;
              activeTop = !isNaN(top) && offset.top < top;

              // deactivate if wrapper is inside range
              if (!activeTop && !activeBottom) {
                deactivate();
              }
            }
            // if not activated
            else if (media.matches) {
              // get element offset
              offset = element.getBoundingClientRect();

              // Modify offset
              offset = {top: offset.top + scope.topModifier}

              activeBottom = !isNaN(bottom) && offset.top > window.innerHeight - bottom - element.offsetHeight;
              activeTop = !isNaN(top) && offset.top < top;

              // activate if element is outside range
              if (activeTop || activeBottom) {
                activate();
              }
            }
          }
        }

        // window resize listener
        function onresize() {
          // NB: we care only if visible
          if (el[0].offsetHeight > 0) {
            // conditionally deactivate sticky
            if (activeTop || activeBottom) {
              deactivate();
            }

            // re-initialize sticky
            onscroll();
          }
        }

        // destroy listener
        function ondestroy() {
          onresize();

          document.querySelector('md-content').removeEventListener('scroll', onscroll);
          window.removeEventListener('resize', onresize);
        }

        // bind listeners TO MD CONTENT
        document.querySelector('md-content').addEventListener('scroll', onscroll);
        window.addEventListener('resize', onresize);

        scope.$on('$destroy', ondestroy);

        // initialize sticky
        onscroll();
      }
    }
  })

  .directive('wizardBalloon', function ($timeout, colors) {
    return {
      restrict: 'A',
      scope: {
        text: '=',
        direction: '='
      },
      templateUrl: 'src/directives/wizardBalloon.html'
    }
  })
