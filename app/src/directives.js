'use strict';

/* Services */

angular.module('app.directives', [])
  
  .directive('hexus', function ($timeout, usStatesHex, colors) {
    return {
      restrict: 'A',
      scope: {
          data: '=',
          statuses: '=',
          setState: '=',
          state: '=',
          backgroundClick: '='
      },
      link: function($scope, el, attrs) {

        el.html('<div>Loading...</div>');
        
        $scope.$watch('statuses', redraw, true);
        $scope.$watch('state', redraw);

        function redraw() {
          if ($scope.statuses !== undefined){
            $timeout(function () {
              el.html('');
      
              var states = usStatesHex.data;

              // Semiotic settings
              var settings = {
                color: {
                  selected:     colors.mapItemHighlight,
                  hover:        colors.mapItemHighlight,
                  loading:      colors.mapItemLoading,
                  available:    colors.mapItemReady,
                  unavailable:  colors.mapItemUnavailable
                },
                opacity: {
                  selected: 1,
                  hover: 1,
                  loading: 1,
                  available: 1,
                  unavailable: 1
                }
              }

              // Setup: dimensions
              var margin = {top: 24, right: 0, bottom: 24, left: 0};
              var width = el[0].offsetWidth - margin.left - margin.right;
              var height = el[0].offsetHeight - margin.top - margin.bottom;

              // Setup: scales
              var size = d3.scale.linear()
                  .range([0, height]);

              // Setup: SVG container
              var svg = d3.select(el[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

              // Binding: scales
              size.domain(d3.extent(
                states.map(function(d) { return d.yExtent[0]; })
                .concat(states.map(function(d) { return d.yExtent[1]; }))
              ));

              var xExtent = d3.extent(
                states.map(function(d) { return d.xExtent[0]; })
                .concat(states.map(function(d) { return d.xExtent[1]; }))
              )
              var xOffset = -size(xExtent[0]) + (width / 2 - ( size(xExtent[1]) - size(xExtent[0]) ) / 2 )
              
              var lineFunction = d3.svg.line()
                .x(function(d) { return xOffset + size(d[0]); })
                .y(function(d) { return size(d[1]); })
                .interpolate('linear');

              var stateGroups = svg.selectAll('.hex')
                .data(states)
              .enter().append('g')
                .attr('class', 'hex')
                .style('cursor', function(d){
                  if (regionValid(d)) {
                    return 'pointer'
                  }
                  return 'default'
                })
                .on('mouseover', function(d) {
                  if (regionValid(d)) {
                    d3.select(this).select('path.hexagon')
                      .attr('fill', settings.color.hover)
                    d3.select(this).select('text.border')
                      .attr('stroke', settings.color.hover)
                      .attr('fill', settings.color.hover)
                  }
                })                  
                .on('mouseout', function(d) {
                  if (regionValid(d)) {
                    d3.select(this).select('path')
                      .attr('fill', regionColor)
                    d3.select(this).select('text.border')
                      .attr('stroke', regionColor)
                      .attr('fill', regionColor)
                  }
                })
                .on('click', function(d) {
                  d3.event.stopPropagation();
                  if (regionValid(d)) {
                    $scope.setState(d.abbr)
                  }
                })

              stateGroups.append('path')
                .attr('class', 'hexagon')
                .attr('d', function (d) { return lineFunction(d.hex); })
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', regionColor)

              stateGroups.append('path')
                .attr('class', 'sparkline')
                .attr('d', function (d) {
                  if (regionValid(d)) {
                    var sparklineFunction = buildSparklineFunction(d)
                    return sparklineFunction($scope.data[d.abbr])
                  }
                })
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', 'none')
                .attr('opacity', .8)

              // Border text
              var yTextOffset = 10;
              stateGroups.append('text')
                .attr('class', 'border')
                .text(function (d) { return d.abbr })
                .attr('x', function(d){ return xOffset + size(d.x) })
                .attr('y', function(d){ return yTextOffset + size(d.y) })
                .attr('font-family', 'Roboto')
                .attr('font-weight', '100')
                .attr('font-size', '26px')
                .attr('stroke', regionColor)
                .attr('stroke-width', 8)
                .attr('fill', regionColor)
                .attr('text-anchor', 'middle')
                .attr('opacity', 0.6)

              stateGroups.append('text')
                .text(function (d) { return d.abbr })
                .attr('x', function(d){ return xOffset + size(d.x) })
                .attr('y', function(d){ return yTextOffset + size(d.y) })
                .attr('font-family', 'Roboto')
                .attr('font-weight', '100')
                .attr('font-size', '26px')
                .attr('fill', 'white')
                .attr('text-anchor', 'middle')
                .attr('opacity', 1)

              function buildSparklineFunction(region) {
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
              }

              function regionValid(d) {
                return $scope.statuses[d.abbr] && $scope.statuses[d.abbr].available
              }

              function regionOpacity(d) {
                if ($scope.state == d.abbr) {
                  return settings.opacity.selected
                } else if ($scope.statuses[d.abbr]) {
                  if ($scope.statuses[d.abbr].loading) {
                    return settings.opacity.loading
                  } else if ($scope.statuses[d.abbr].available) {
                    return settings.opacity.available
                  } else {
                    return settings.opacity.unavailable
                  }
                } else {
                  return settings.opacity.loading
                }
              }

              function regionColor(d) {
                if ($scope.state == d.abbr) {
                  return settings.color.selected
                } else if ($scope.statuses[d.abbr]) {
                  if ($scope.statuses[d.abbr].loading) {
                    return settings.color.loading
                  } else if ($scope.statuses[d.abbr].available) {
                    return settings.color.available
                  } else {
                    return settings.color.unavailable
                  }
                } else {
                  return settings.color.loading
                }
              }
            }, 0, false);
          }
        }
      }
    }
  })

  .directive('happinessChart', function ($timeout, colors) {
    return {
      restrict: 'A',
      scope: {
          data: '='
      },
      link: function($scope, el, attrs) {
        el.html('<div>Loading...</div>');

        $scope.$watch('data', redraw, true);

        function redraw() {
          if ($scope.data !== undefined) {
            $timeout(function () {
              el.html('');

              // Setup: dimensions
              var margin = {top: 24, right: 0, bottom: 24, left: 30};
              var width = el[0].offsetWidth - margin.left - margin.right;
              var height = el[0].offsetHeight - margin.top - margin.bottom;

              // Setup: scales
              var x = d3.scale.ordinal()
                .domain(d3.keys($scope.data))
                .rangeRoundBands([0, width], .2);
    
              var y = d3.scale.linear()
                .domain(d3.extent($scope.data))
                .range([height, 0]);

              var yAxis = d3.svg.axis()
              .scale(y)
              .orient("left");

              // Draw
              var svg = d3.select(el[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

              svg.selectAll(".bar")
                .data($scope.data)
              .enter().append("rect")
                .attr("class", function(d) { return d < 0 ? "bar negative" : "bar positive"; })
                .attr('fill', function(d) { return d < 0 ? colors.barNegative : colors.barPositive; })
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d) { return y(Math.max(0, d)); })
                .attr("width", x.rangeBand())
                .attr("height", function(d) { return Math.abs(y(d) - y(0)); })

              svg.append("g")
                  .attr("class", "x axis")
                .append("line")
                  .attr("y1", y(0))
                  .attr("y2", y(0))
                  .attr("x2", width);

              svg.append("g")
                  .attr("class", "y axis")
                  .call(yAxis);

            })
          }
        }
      }
    }
  })
