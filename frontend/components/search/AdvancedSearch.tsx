"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  SortAsc,
  SortDesc,
  RotateCcw,
  Save,
  History,
  Star,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Clock,
  Target,
  ChevronDown,
  Plus,
  Minus
} from "lucide-react"
import { format, subDays, subWeeks, subMonths } from "date-fns"
import { vi } from "date-fns/locale"

interface SearchFilter {
  id: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'range' | 'boolean'
  options?: { value: string; label: string; count?: number }[]
  value?: any
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

interface SortOption {
  value: string
  label: string
  direction: 'asc' | 'desc'
}

interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'suggestion'
  category?: string
  count?: number
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: Record<string, any>
  createdAt: Date
  isStarred: boolean
}

interface AdvancedSearchProps {
  placeholder?: string
  filters?: SearchFilter[]
  sortOptions?: SortOption[]
  onSearch?: (query: string, filters: Record<string, any>, sort?: SortOption) => void
  onFilterChange?: (filters: Record<string, any>) => void
  suggestions?: SearchSuggestion[]
  savedSearches?: SavedSearch[]
  showSuggestions?: boolean
  showFilters?: boolean
  showSort?: boolean
  showSavedSearches?: boolean
  className?: string
}

const DEFAULT_FILTERS: SearchFilter[] = [
  {
    id: 'type',
    label: 'Loại',
    type: 'multiselect',
    options: [
      { value: 'exam', label: 'Bài kiểm tra', count: 45 },
      { value: 'student', label: 'Học sinh', count: 1250 },
      { value: 'class', label: 'Lớp học', count: 25 },
      { value: 'result', label: 'Kết quả', count: 890 }
    ]
  },
  {
    id: 'status',
    label: 'Trạng thái',
    type: 'select',
    options: [
      { value: 'all', label: 'Tất cả' },
      { value: 'active', label: 'Hoạt động' },
      { value: 'inactive', label: 'Không hoạt động' },
      { value: 'pending', label: 'Chờ xử lý' }
    ]
  },
  {
    id: 'dateRange',
    label: 'Khoảng thời gian',
    type: 'daterange'
  },
  {
    id: 'score',
    label: 'Điểm số',
    type: 'range',
    min: 0,
    max: 10,
    step: 0.1
  },
  {
    id: 'difficulty',
    label: 'Độ khó',
    type: 'select',
    options: [
      { value: 'all', label: 'Tất cả' },
      { value: 'easy', label: 'Dễ' },
      { value: 'medium', label: 'Trung bình' },
      { value: 'hard', label: 'Khó' }
    ]
  }
]

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Độ liên quan', direction: 'desc' },
  { value: 'date', label: 'Ngày tạo', direction: 'desc' },
  { value: 'name', label: 'Tên', direction: 'asc' },
  { value: 'score', label: 'Điểm số', direction: 'desc' },
  { value: 'popularity', label: 'Phổ biến', direction: 'desc' }
]

const QUICK_DATE_RANGES = [
  { label: 'Hôm nay', value: 'today', days: 0 },
  { label: '7 ngày qua', value: '7days', days: 7 },
  { label: '30 ngày qua', value: '30days', days: 30 },
  { label: '3 tháng qua', value: '3months', days: 90 },
  { label: 'Năm nay', value: 'thisyear', days: 365 }
]

export default function AdvancedSearch({
  placeholder = "Tìm kiếm...",
  filters = DEFAULT_FILTERS,
  sortOptions = DEFAULT_SORT_OPTIONS,
  onSearch,
  onFilterChange,
  suggestions = [],
  savedSearches = [],
  showSuggestions = true,
  showFilters = true,
  showSort = true,
  showSavedSearches = true,
  className = ""
}: AdvancedSearchProps) {
  const [query, setQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>(savedSearches)
  const { toast } = useToast()
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string, searchFilters: Record<string, any>) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      onSearch?.(searchQuery, searchFilters, selectedSort)
    }, 300)
  }, [onSearch, selectedSort])

  // Handle search input change
  const handleQueryChange = (value: string) => {
    setQuery(value)
    setIsSuggestionsOpen(value.length > 0)
    debouncedSearch(value, activeFilters)
  }

  // Handle filter change
  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters, [filterId]: value }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
    debouncedSearch(query, newFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({})
    onFilterChange?.({})
    debouncedSearch(query, {})
    toast({
      title: "Đã xóa bộ lọc",
      description: "Tất cả bộ lọc đã được xóa"
    })
  }

  // Save current search
  const saveCurrentSearch = () => {
    const searchName = prompt("Tên tìm kiếm:")
    if (!searchName) return

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      query,
      filters: activeFilters,
      createdAt: new Date(),
      isStarred: false
    }

    setSearchHistory(prev => [newSavedSearch, ...prev])
    toast({
      title: "Đã lưu tìm kiếm",
      description: `Tìm kiếm "${searchName}" đã được lưu`
    })
  }

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query)
    setActiveFilters(savedSearch.filters)
    setIsSuggestionsOpen(false)
    onSearch?.(savedSearch.query, savedSearch.filters, selectedSort)
  }

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(value => 
      value !== undefined && value !== null && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }, [activeFilters])

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query) return suggestions.slice(0, 5)
    
    return suggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
  }, [query, suggestions])

  // Render filter component
  const renderFilter = (filter: SearchFilter) => {
    const value = activeFilters[filter.id]

    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleFilterChange(filter.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn..." />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.count && (
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            {filter.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  checked={value?.includes(option.value) || false}
                  onCheckedChange={(checked) => {
                    const currentValues = value || []
                    const newValues = checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value)
                    handleFilterChange(filter.id, newValues)
                  }}
                />
                <Label className="flex-1 flex items-center justify-between">
                  <span>{option.label}</span>
                  {option.count && (
                    <Badge variant="secondary">
                      {option.count}
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'range':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{filter.min}</span>
              <span>{filter.max}</span>
            </div>
            <Slider
              value={value || [filter.min || 0, filter.max || 100]}
              onValueChange={(val) => handleFilterChange(filter.id, val)}
              min={filter.min}
              max={filter.max}
              step={filter.step}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{value?.[0] || filter.min}</span>
              <span>{value?.[1] || filter.max}</span>
            </div>
          </div>
        )

      case 'daterange':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_DATE_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const endDate = new Date()
                    const startDate = range.days === 0 ? endDate : subDays(endDate, range.days)
                    handleFilterChange(filter.id, { from: startDate, to: endDate })
                  }}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <Separator />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.from ? (
                    value.to ? (
                      <>
                        {format(value.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                        {format(value.to, "dd/MM/yyyy", { locale: vi })}
                      </>
                    ) : (
                      format(value.from, "dd/MM/yyyy", { locale: vi })
                    )
                  ) : (
                    "Chọn khoảng thời gian"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={value}
                  onSelect={(range) => handleFilterChange(filter.id, range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => handleFilterChange(filter.id, checked)}
            />
            <Label>{filter.label}</Label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main search bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={searchInputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsSuggestionsOpen(query.length > 0)}
            className="pl-10 pr-20"
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="relative"
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
            
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("")
                  setIsSuggestionsOpen(false)
                  onSearch?.("", activeFilters, selectedSort)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search suggestions */}
        <AnimatePresence>
          {showSuggestions && isSuggestionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 z-50 mt-1"
            >
              <Card>
                <CardContent className="p-0">
                  <Command>
                    <CommandList>
                      {filteredSuggestions.length > 0 ? (
                        <>
                          <CommandGroup heading="Gợi ý">
                            {filteredSuggestions.map((suggestion) => (
                              <CommandItem
                                key={suggestion.id}
                                onSelect={() => {
                                  setQuery(suggestion.text)
                                  setIsSuggestionsOpen(false)
                                  onSearch?.(suggestion.text, activeFilters, selectedSort)
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {suggestion.type === 'recent' && <History className="h-4 w-4" />}
                                  {suggestion.type === 'popular' && <TrendingUp className="h-4 w-4" />}
                                  {suggestion.type === 'suggestion' && <Search className="h-4 w-4" />}
                                  <span className="flex-1">{suggestion.text}</span>
                                  {suggestion.count && (
                                    <Badge variant="secondary">{suggestion.count}</Badge>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          
                          {showSavedSearches && searchHistory.length > 0 && (
                            <>
                              <Separator />
                              <CommandGroup heading="Tìm kiếm đã lưu">
                                {searchHistory.slice(0, 3).map((saved) => (
                                  <CommandItem
                                    key={saved.id}
                                    onSelect={() => loadSavedSearch(saved)}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <Star className={`h-4 w-4 ${saved.isStarred ? 'text-yellow-500' : ''}`} />
                                      <span className="flex-1">{saved.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {format(saved.createdAt, "dd/MM", { locale: vi })}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </>
                      ) : (
                        <CommandEmpty>Không tìm thấy gợi ý nào</CommandEmpty>
                      )}
                    </CommandList>
                  </Command>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2"
        >
          {Object.entries(activeFilters).map(([filterId, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            
            const filter = filters.find(f => f.id === filterId)
            if (!filter) return null

            return (
              <Badge key={filterId} variant="secondary" className="gap-1">
                <span className="font-medium">{filter.label}:</span>
                <span>
                  {Array.isArray(value) 
                    ? value.join(", ") 
                    : typeof value === 'object' && value.from
                    ? `${format(value.from, "dd/MM")} - ${format(value.to, "dd/MM")}`
                    : value.toString()
                  }
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleFilterChange(filterId, undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
          
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Xóa tất cả
          </Button>
        </motion.div>
      )}

      {/* Advanced filters panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bộ lọc nâng cao</CardTitle>
                    <CardDescription>Tùy chỉnh kết quả tìm kiếm</CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showSort && (
                      <Select 
                        value={selectedSort.value} 
                        onValueChange={(value) => {
                          const sort = sortOptions.find(s => s.value === value)
                          if (sort) {
                            setSelectedSort(sort)
                            onSearch?.(query, activeFilters, sort)
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                {option.direction === 'asc' ? (
                                  <SortAsc className="h-4 w-4" />
                                ) : (
                                  <SortDesc className="h-4 w-4" />
                                )}
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button variant="outline" size="sm" onClick={saveCurrentSearch}>
                      <Save className="h-4 w-4 mr-2" />
                      Lưu
                    </Button>
                    
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <Label className="font-medium">{filter.label}</Label>
                      {renderFilter(filter)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 