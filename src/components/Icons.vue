<script setup>
// 图标组件 - 使用Lucide图标
import {
  Plane,
  PenTool,
  Globe,
  Lightbulb,
  Sparkles,
  Zap,
  Shield,
  Gift,
  ArrowRight,
  ChevronRight,
  Home,
  Menu,
  X,
  Sun,
  Moon,
  Send,
  RefreshCw,
  Check,
  Copy,
  Download,
  Share2,
  Star,
  Heart,
  BookOpen,
  MessageSquare,
  Brain,
  Wand2,
  Languages,
  Map,
  Compass,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  Edit3,
  Type,
  AlignLeft,
  Briefcase,
  MessageCircle,
  RotateCcw,
  ArrowLeftRight,
  HelpCircle,
  ListChecks,
  Target,
  Scale,
} from 'lucide-vue-next'

// 导出所有图标供其他组件使用
defineExpose({
  Plane, PenTool, Globe, Lightbulb, Sparkles, Zap, Shield, Gift,
  ArrowRight, ChevronRight, Home, Menu, X, Sun, Moon, Send, RefreshCw,
  Check, Copy, Download, Share2, Star, Heart, BookOpen, MessageSquare,
  Brain, Wand2, Languages, Map, Compass, Clock, DollarSign, Users,
  TrendingUp, BarChart3, FileText, Edit3, Type, AlignLeft, Briefcase,
  MessageCircle, RotateCcw, ArrowLeftRight, HelpCircle, ListChecks, Target, Scale
})
</script>

<template>
  <slot></slot>
</template>
